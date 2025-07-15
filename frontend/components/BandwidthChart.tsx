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
import { Box, Text, VStack, HStack, Badge, Spinner, Center } from '@chakra-ui/react';
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

interface BandwidthChartProps {
  resellers: Reseller[];
  height?: number;
}

interface ChartDataPoint {
  time: string;
  reseller_id: string;
  rx_mbps: number;
  tx_mbps: number;
  total_mbps: number;
}

const COLORS = [
  'rgba(59, 130, 246, 0.8)',   // Blue
  'rgba(16, 185, 129, 0.8)',   // Green
  'rgba(245, 101, 101, 0.8)',  // Red
  'rgba(251, 191, 36, 0.8)',   // Yellow
  'rgba(139, 92, 246, 0.8)',   // Purple
  'rgba(236, 72, 153, 0.8)',   // Pink
];

const BORDER_COLORS = [
  'rgba(59, 130, 246, 1)',
  'rgba(16, 185, 129, 1)',
  'rgba(245, 101, 101, 1)',
  'rgba(251, 191, 36, 1)',
  'rgba(139, 92, 246, 1)',
  'rgba(236, 72, 153, 1)',
];

export default function BandwidthChart({ resellers, height = 400 }: BandwidthChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBandwidthData = async () => {
    try {
      const promises = resellers.map(async (reseller) => {
        try {
          const usage = await apiClient.getResellerUsage(reseller.id, 1); // Last 1 hour
          return usage.map(point => ({
            time: new Date(point.ts).toLocaleTimeString(),
            reseller_id: reseller.id,
            reseller_name: reseller.name,
            rx_mbps: point.rx_mbps,
            tx_mbps: point.tx_mbps,
            total_mbps: point.rx_mbps + point.tx_mbps,
          }));
        } catch (error) {
          console.error(`Error fetching data for ${reseller.id}:`, error);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const allData = results.flat();
      
      // Sort by time and take last 20 points for real-time feel
      const sortedData = allData
        .sort((a, b) => new Date(`1970/01/01 ${a.time}`).getTime() - new Date(`1970/01/01 ${b.time}`).getTime())
        .slice(-20);

      setChartData(sortedData);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching bandwidth data:', err);
      setError('Failed to load bandwidth data');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resellers.length > 0) {
      fetchBandwidthData();
      
      // Set up real-time updates every 30 seconds
      intervalRef.current = setInterval(fetchBandwidthData, 30000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [resellers]);

  // Prepare chart data
  const getChartData = () => {
    if (chartData.length === 0) return null;

    // Get unique time labels
    const timeLabels = Array.from(new Set(chartData.map(d => d.time))).sort((a, b) => 
      new Date(`1970/01/01 ${a}`).getTime() - new Date(`1970/01/01 ${b}`).getTime()
    );

    // Create datasets for each reseller
    const datasets = resellers.map((reseller, index) => {
      const resellerData = chartData.filter(d => d.reseller_id === reseller.id);
      
      // Map data points to time labels
      const dataPoints = timeLabels.map(time => {
        const point = resellerData.find(d => d.time === time);
        return point ? point.total_mbps : 0;
      });

      return {
        label: reseller.name,
        data: dataPoints,
        borderColor: BORDER_COLORS[index % BORDER_COLORS.length],
        backgroundColor: COLORS[index % COLORS.length],
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    return {
      labels: timeLabels,
      datasets,
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
          padding: 20,
        },
      },
      title: {
        display: true,
        text: 'Real-time Bandwidth Usage',
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

  // Calculate current totals
  const getCurrentTotals = () => {
    if (chartData.length === 0) return { total: 0, breakdown: [] };

    const latestTime = chartData.reduce((latest, point) => 
      new Date(`1970/01/01 ${point.time}`).getTime() > new Date(`1970/01/01 ${latest}`).getTime() 
        ? point.time 
        : latest
    , chartData[0].time);

    const latestData = chartData.filter(d => d.time === latestTime);
    const total = latestData.reduce((sum, point) => sum + point.total_mbps, 0);
    
    const breakdown = resellers.map(reseller => {
      const resellerPoint = latestData.find(d => d.reseller_id === reseller.id);
      return {
        name: reseller.name,
        usage: resellerPoint ? resellerPoint.total_mbps : 0,
        plan: reseller.plan_mbps,
        utilization: resellerPoint ? (resellerPoint.total_mbps / reseller.plan_mbps) * 100 : 0,
      };
    });

    return { total, breakdown };
  };

  if (loading) {
    return (
      <Center h={height}>
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.500" fontSize="lg">Loading bandwidth data...</Text>
          <Text color="gray.400" fontSize="sm">Fetching real-time traffic information</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center h={height}>
        <VStack spacing={4}>
          <Text color="red.500">{error}</Text>
          <Text fontSize="sm" color="gray.500">
            Using mock data for demonstration
          </Text>
        </VStack>
      </Center>
    );
  }

  const data = getChartData();
  const { total, breakdown } = getCurrentTotals();

  return (
    <Box>
      {/* Current Usage Summary */}
      <VStack spacing={4} mb={4}>
        <HStack spacing={4} flexWrap="wrap">
          <Badge colorScheme="blue" p={2} borderRadius="md">
            Total: {total.toFixed(1)} Mbps
          </Badge>
          {breakdown.map((item, index) => (
            <Badge 
              key={item.name}
              colorScheme={item.utilization >= 80 ? 'red' : item.utilization >= 60 ? 'yellow' : 'green'}
              p={2} 
              borderRadius="md"
            >
              {item.name}: {item.usage.toFixed(1)} Mbps ({item.utilization.toFixed(1)}%)
            </Badge>
          ))}
        </HStack>
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