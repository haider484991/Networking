import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  Box, 
  Text, 
  VStack, 
  HStack, 
  Badge, 
  Spinner, 
  Center, 
  Progress,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { apiClient, Reseller } from '../utils/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface NTTNChartProps {
  resellers: Reseller[];
  height?: number;
}

interface AggregatedDataPoint {
  time: string;
  total_mbps: number;
  threshold_90: number;
  threshold_100: number;
  alert_level: 'normal' | 'warning' | 'critical';
}

export default function NTTNChart({ resellers, height = 350 }: NTTNChartProps) {
  const [chartData, setChartData] = useState<AggregatedDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<{
    total: number;
    capacity: number;
    utilization: number;
    alertLevel: 'normal' | 'warning' | 'critical';
  }>({
    total: 0,
    capacity: 0,
    utilization: 0,
    alertLevel: 'normal',
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate total capacity from all resellers
  const totalCapacity = resellers.reduce((sum, reseller) => sum + reseller.plan_mbps, 0);

  const fetchAggregatedData = async () => {
    try {
      const promises = resellers.map(async (reseller) => {
        try {
          const usage = await apiClient.getResellerUsage(reseller.id, 1); // Last 1 hour
          return usage.map(point => ({
            time: new Date(point.ts).toLocaleTimeString(),
            reseller_id: reseller.id,
            total_mbps: point.rx_mbps + point.tx_mbps,
          }));
        } catch (error) {
          console.error(`Error fetching data for ${reseller.id}:`, error);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const allData = results.flat();
      
      // Group by time and aggregate
      const timeGroups = allData.reduce((groups, point) => {
        if (!groups[point.time]) {
          groups[point.time] = [];
        }
        groups[point.time].push(point);
        return groups;
      }, {} as Record<string, any[]>);

      // Calculate aggregated data points
      const aggregatedData: AggregatedDataPoint[] = Object.entries(timeGroups)
        .map(([time, points]) => {
          const total = points.reduce((sum, point) => sum + point.total_mbps, 0);
          const utilization = (total / totalCapacity) * 100;
          
          let alertLevel: 'normal' | 'warning' | 'critical' = 'normal';
          if (utilization >= 100) alertLevel = 'critical';
          else if (utilization >= 90) alertLevel = 'warning';

          return {
            time,
            total_mbps: total,
            threshold_90: totalCapacity * 0.9,
            threshold_100: totalCapacity,
            alert_level: alertLevel,
          };
        })
        .sort((a, b) => 
          new Date(`1970/01/01 ${a.time}`).getTime() - new Date(`1970/01/01 ${b.time}`).getTime()
        )
        .slice(-20); // Keep last 20 points

      setChartData(aggregatedData);
      
      // Update current status
      if (aggregatedData.length > 0) {
        const latest = aggregatedData[aggregatedData.length - 1];
        setCurrentStatus({
          total: latest.total_mbps,
          capacity: totalCapacity,
          utilization: (latest.total_mbps / totalCapacity) * 100,
          alertLevel: latest.alert_level,
        });
      }

      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching NTTN data:', err);
      setError('Failed to load NTTN data');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resellers.length > 0) {
      fetchAggregatedData();
      
      // Set up real-time updates every 30 seconds
      intervalRef.current = setInterval(fetchAggregatedData, 30000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [resellers, totalCapacity]);

  // Prepare chart data
  const getChartData = () => {
    if (chartData.length === 0) return null;

    const labels = chartData.map(d => d.time);
    const totalData = chartData.map(d => d.total_mbps);
    const threshold90Data = chartData.map(d => d.threshold_90);
    const threshold100Data = chartData.map(d => d.threshold_100);

    return {
      labels,
      datasets: [
        {
          label: 'Total Bandwidth',
          data: totalData,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: '90% Threshold',
          data: threshold90Data,
          borderColor: 'rgba(251, 191, 36, 1)',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
        {
          label: '100% Threshold',
          data: threshold100Data,
          borderColor: 'rgba(245, 101, 101, 1)',
          backgroundColor: 'rgba(245, 101, 101, 0.1)',
          borderDash: [10, 5],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: 'NTTN Aggregated Link Usage',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            if (context.dataset.label === 'Total Bandwidth') {
              const utilization = (context.parsed.y / totalCapacity) * 100;
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} Mbps (${utilization.toFixed(1)}%)`;
            }
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} Mbps`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Bandwidth (Mbps)',
        },
        beginAtZero: true,
        max: totalCapacity * 1.2, // Show 20% above capacity
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  const getStatusColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical': return 'red';
      case 'warning': return 'yellow';
      default: return 'green';
    }
  };

  const getStatusText = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical': return 'CRITICAL - Over Capacity';
      case 'warning': return 'WARNING - High Usage';
      default: return 'NORMAL - Healthy';
    }
  };

  if (loading) {
    return null; // Make loading invisible
  }

  if (error) {
    return (
      <Center h={height}>
        <VStack spacing={4}>
          <Text color="red.500">{error}</Text>
          <Text fontSize="sm" color="gray.500">
            Check API connection
          </Text>
        </VStack>
      </Center>
    );
  }

  const data = getChartData();

  return (
    <Box>
      {/* Current Status */}
      <VStack spacing={4} mb={4}>
        <HStack spacing={4} flexWrap="wrap" justify="center">
          <Badge colorScheme="blue" p={2} borderRadius="md" fontSize="sm">
            Current: {currentStatus.total.toFixed(1)} Mbps
          </Badge>
          <Badge colorScheme="gray" p={2} borderRadius="md" fontSize="sm">
            Capacity: {currentStatus.capacity.toFixed(0)} Mbps
          </Badge>
          <Badge 
            colorScheme={getStatusColor(currentStatus.alertLevel)} 
            p={2} 
            borderRadius="md"
            fontSize="sm"
          >
            {getStatusText(currentStatus.alertLevel)}
          </Badge>
        </HStack>

        {/* Utilization Progress Bar */}
        <Box w="100%" maxW="400px">
          <Text fontSize="sm" mb={2} textAlign="center">
            Utilization: {currentStatus.utilization.toFixed(1)}%
          </Text>
          <Progress
            value={Math.min(currentStatus.utilization, 100)}
            colorScheme={getStatusColor(currentStatus.alertLevel)}
            size="lg"
            borderRadius="md"
          />
        </Box>

        {/* Alert Messages */}
        {currentStatus.alertLevel === 'critical' && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">
              CRITICAL: NTTN link usage has exceeded 100% capacity! 
              Immediate action required.
            </Text>
          </Alert>
        )}
        {currentStatus.alertLevel === 'warning' && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">
              WARNING: NTTN link usage has exceeded 90% capacity. 
              Monitor closely and prepare for scaling.
            </Text>
          </Alert>
        )}
      </VStack>

      {/* Chart */}
      <Box h={height}>
        {data ? (
          <Line data={data} options={chartOptions} />
        ) : (
          <Center h="100%">
            <Text color="gray.500">No data available</Text>
          </Center>
        )}
      </Box>
    </Box>
  );
} 