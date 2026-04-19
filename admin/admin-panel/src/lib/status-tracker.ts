import axios from 'axios';

const STATUS_TRACKER_URL = process.env.NEXT_PUBLIC_STATUS_TRACKER_URL || 'http://localhost:4100';

export interface DataPoint {
  day: string;
  hour: number;
  status: 'green' | 'yellow' | 'red';
  avgPing: number;
  downCount: number;
}

export interface ServiceStatus {
  type: string;
  status: 'green' | 'yellow' | 'red';
  currentPing: number;
  uptime: number;
  lastChecked: number;
  timeline: DataPoint[];
}

export const statusTrackerApi = {
  getTypes: async (): Promise<string[]> => {
    try {
      const { data } = await axios.get(`${STATUS_TRACKER_URL}/tracker/types`);
      return data.types;
    } catch (error) {
      console.error('Error fetching tracker types:', error);
      return [];
    }
  },

  getServiceStatus: async (type: string, range: string): Promise<ServiceStatus | null> => {
    try {
      const { data } = await axios.get(`${STATUS_TRACKER_URL}/tracker/${type}?range=${range}`);
      return data;
    } catch (error) {
      console.error(`Error fetching tracker data for ${type}:`, error);
      return null;
    }
  }
};
