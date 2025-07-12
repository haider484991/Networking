"""PDF report generation for reseller usage statistics."""
from __future__ import annotations

import io
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.linecharts import HorizontalLineChart
    from reportlab.graphics.charts.lineplots import LinePlot
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.backends.backend_pdf import PdfPages
import pandas as pd
from pathlib import Path


class PDFReportGenerator:
    """Generate PDF usage reports for resellers."""
    
    def __init__(self, output_dir: str = "reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        if not REPORTLAB_AVAILABLE:
            print("Warning: ReportLab not available. Using matplotlib for PDF generation.")
    
    def generate_monthly_report(
        self, 
        reseller_id: str, 
        reseller_name: str,
        plan_mbps: int,
        usage_data: List[Dict[str, Any]], 
        alerts: List[Dict[str, Any]],
        month: str = None
    ) -> str:
        """
        Generate a monthly PDF report for a reseller.
        
        Args:
            reseller_id: Reseller ID
            reseller_name: Reseller name
            plan_mbps: Reseller's bandwidth plan
            usage_data: List of usage data points
            alerts: List of alerts for the month
            month: Month string (e.g., "2024-01"), defaults to current month
            
        Returns:
            Path to the generated PDF file
        """
        if month is None:
            month = datetime.now().strftime("%Y-%m")
        
        filename = f"{reseller_id}_{reseller_name.replace(' ', '_')}_report_{month}.pdf"
        filepath = self.output_dir / filename
        
        if REPORTLAB_AVAILABLE:
            return self._generate_reportlab_pdf(
                filepath, reseller_id, reseller_name, plan_mbps, usage_data, alerts, month
            )
        else:
            return self._generate_matplotlib_pdf(
                filepath, reseller_id, reseller_name, plan_mbps, usage_data, alerts, month
            )
    
    def _generate_reportlab_pdf(
        self, 
        filepath: Path, 
        reseller_id: str, 
        reseller_name: str,
        plan_mbps: int,
        usage_data: List[Dict[str, Any]], 
        alerts: List[Dict[str, Any]],
        month: str
    ) -> str:
        """Generate PDF using ReportLab."""
        doc = SimpleDocTemplate(str(filepath), pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=HexColor('#2E86AB'),
            alignment=1  # Center alignment
        )
        story.append(Paragraph(f"Monthly Usage Report - {reseller_name}", title_style))
        story.append(Spacer(1, 20))
        
        # Report Info
        info_data = [
            ["Report Period:", month],
            ["Reseller ID:", reseller_id],
            ["Reseller Name:", reseller_name],
            ["Bandwidth Plan:", f"{plan_mbps} Mbps"],
            ["Generated:", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 3*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 0), (0, -1), HexColor('#e9ecef')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 30))
        
        # Usage Summary
        if usage_data:
            story.append(Paragraph("Usage Summary", styles['Heading2']))
            
            # Calculate statistics
            total_rx = sum(float(d.get('rx_mbps', 0)) for d in usage_data)
            total_tx = sum(float(d.get('tx_mbps', 0)) for d in usage_data)
            avg_rx = total_rx / len(usage_data) if usage_data else 0
            avg_tx = total_tx / len(usage_data) if usage_data else 0
            peak_usage = max((float(d.get('rx_mbps', 0)) + float(d.get('tx_mbps', 0))) for d in usage_data) if usage_data else 0
            peak_utilization = (peak_usage / plan_mbps) * 100 if plan_mbps > 0 else 0
            
            summary_data = [
                ["Metric", "Value"],
                ["Average Download", f"{avg_rx:.2f} Mbps"],
                ["Average Upload", f"{avg_tx:.2f} Mbps"],
                ["Peak Usage", f"{peak_usage:.2f} Mbps"],
                ["Peak Utilization", f"{peak_utilization:.1f}%"],
                ["Total Data Points", str(len(usage_data))],
            ]
            
            summary_table = Table(summary_data, colWidths=[2.5*inch, 2.5*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2E86AB')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8f9fa')),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 11),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(summary_table)
            story.append(Spacer(1, 20))
        
        # Alerts Summary
        if alerts:
            story.append(Paragraph("Alerts Summary", styles['Heading2']))
            
            alert_counts = {}
            for alert in alerts:
                level = alert.get('level', 'UNKNOWN')
                alert_counts[level] = alert_counts.get(level, 0) + 1
            
            alert_data = [["Alert Level", "Count"]]
            for level, count in sorted(alert_counts.items()):
                alert_data.append([level, str(count)])
            
            alert_table = Table(alert_data, colWidths=[2.5*inch, 2.5*inch])
            alert_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#dc3545')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8f9fa')),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 11),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(alert_table)
            story.append(Spacer(1, 20))
        
        # Footer
        story.append(Spacer(1, 50))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=10,
            textColor=HexColor('#6c757d'),
            alignment=1
        )
        story.append(Paragraph("Generated by ISP Reseller Monitoring System", footer_style))
        
        doc.build(story)
        return str(filepath)
    
    def _generate_matplotlib_pdf(
        self, 
        filepath: Path, 
        reseller_id: str, 
        reseller_name: str,
        plan_mbps: int,
        usage_data: List[Dict[str, Any]], 
        alerts: List[Dict[str, Any]],
        month: str
    ) -> str:
        """Generate PDF using matplotlib as fallback."""
        with PdfPages(str(filepath)) as pdf:
            # Page 1: Summary and Chart
            fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8.5, 11))
            fig.suptitle(f'Monthly Usage Report - {reseller_name}', fontsize=16, fontweight='bold')
            
            # Summary text
            ax1.axis('off')
            summary_text = f"""
Report Period: {month}
Reseller ID: {reseller_id}
Reseller Name: {reseller_name}
Bandwidth Plan: {plan_mbps} Mbps
Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
            """
            ax1.text(0.1, 0.8, summary_text, fontsize=12, verticalalignment='top', 
                    bbox=dict(boxstyle="round,pad=0.5", facecolor="lightgray"))
            
            # Usage chart
            if usage_data:
                timestamps = [datetime.fromisoformat(d['ts'].replace('Z', '+00:00')) for d in usage_data]
                rx_data = [float(d.get('rx_mbps', 0)) for d in usage_data]
                tx_data = [float(d.get('tx_mbps', 0)) for d in usage_data]
                
                ax2.plot(timestamps, rx_data, label='Download', linewidth=2, color='blue')
                ax2.plot(timestamps, tx_data, label='Upload', linewidth=2, color='red')
                ax2.axhline(y=plan_mbps, color='green', linestyle='--', label=f'Plan Limit ({plan_mbps} Mbps)')
                ax2.set_xlabel('Time')
                ax2.set_ylabel('Bandwidth (Mbps)')
                ax2.set_title('Bandwidth Usage Over Time')
                ax2.legend()
                ax2.grid(True, alpha=0.3)
                
                # Format x-axis
                ax2.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
                ax2.xaxis.set_major_locator(mdates.DayLocator(interval=1))
                plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45)
            else:
                ax2.text(0.5, 0.5, 'No usage data available', ha='center', va='center', 
                        transform=ax2.transAxes, fontsize=14)
                ax2.axis('off')
            
            plt.tight_layout()
            pdf.savefig(fig, bbox_inches='tight')
            plt.close()
            
            # Page 2: Alerts (if any)
            if alerts:
                fig, ax = plt.subplots(figsize=(8.5, 11))
                fig.suptitle('Alerts Summary', fontsize=16, fontweight='bold')
                
                ax.axis('off')
                
                # Count alerts by level
                alert_counts = {}
                for alert in alerts:
                    level = alert.get('level', 'UNKNOWN')
                    alert_counts[level] = alert_counts.get(level, 0) + 1
                
                # Create alert summary text
                alert_text = "Alert Summary:\n\n"
                for level, count in sorted(alert_counts.items()):
                    alert_text += f"{level}: {count} alerts\n"
                
                ax.text(0.1, 0.9, alert_text, fontsize=12, verticalalignment='top',
                       bbox=dict(boxstyle="round,pad=0.5", facecolor="lightyellow"))
                
                # Recent alerts details
                recent_alerts = sorted(alerts, key=lambda x: x.get('sent_at', ''), reverse=True)[:10]
                if recent_alerts:
                    details_text = "\nRecent Alerts:\n\n"
                    for alert in recent_alerts:
                        sent_at = alert.get('sent_at', 'Unknown')
                        level = alert.get('level', 'UNKNOWN')
                        message = alert.get('message', 'No message')
                        details_text += f"{sent_at} - {level}: {message}\n"
                    
                    ax.text(0.1, 0.6, details_text, fontsize=10, verticalalignment='top',
                           bbox=dict(boxstyle="round,pad=0.5", facecolor="lightcoral", alpha=0.7))
                
                pdf.savefig(fig, bbox_inches='tight')
                plt.close()
        
        return str(filepath)
    
    def generate_all_monthly_reports(self, resellers_data: List[Dict[str, Any]], month: str = None) -> List[str]:
        """Generate monthly reports for all resellers."""
        generated_files = []
        
        for reseller_data in resellers_data:
            try:
                filepath = self.generate_monthly_report(
                    reseller_data['id'],
                    reseller_data['name'],
                    reseller_data['plan_mbps'],
                    reseller_data.get('usage_data', []),
                    reseller_data.get('alerts', []),
                    month
                )
                generated_files.append(filepath)
                print(f"Generated report for {reseller_data['name']}: {filepath}")
            except Exception as e:
                print(f"Failed to generate report for {reseller_data['name']}: {e}")
        
        return generated_files


def main():
    """Test the PDF generator with sample data."""
    generator = PDFReportGenerator()
    
    # Sample data
    sample_usage = [
        {'ts': '2024-01-01T00:00:00Z', 'rx_mbps': 45.2, 'tx_mbps': 12.8},
        {'ts': '2024-01-01T01:00:00Z', 'rx_mbps': 67.1, 'tx_mbps': 23.4},
        {'ts': '2024-01-01T02:00:00Z', 'rx_mbps': 89.5, 'tx_mbps': 34.2},
        {'ts': '2024-01-01T03:00:00Z', 'rx_mbps': 123.7, 'tx_mbps': 45.6},
    ]
    
    sample_alerts = [
        {'level': 'YELLOW', 'message': 'Usage exceeded 80%', 'sent_at': '2024-01-01T03:15:00Z'},
        {'level': 'RED', 'message': 'Usage exceeded 100%', 'sent_at': '2024-01-01T03:30:00Z'},
    ]
    
    filepath = generator.generate_monthly_report(
        'r1', 'Test Reseller', 150, sample_usage, sample_alerts, '2024-01'
    )
    
    print(f"Sample report generated: {filepath}")


if __name__ == "__main__":
    main() 