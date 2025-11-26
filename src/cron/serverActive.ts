import cron from 'node-cron';
import axios, { AxiosResponse } from 'axios';

const renderServerUrl: string = 'https://latest-scan2card-backend.onrender.com/';

// Function to ping the server
const keepServerActive = async (): Promise<void> => {
  try {
    // Send a GET request to your Render server URL
    const response: AxiosResponse = await axios.get(renderServerUrl);
    console.log(`Server pinged successfully at ${new Date().toISOString()}:`, response.status);
  } catch (error: any) {
    console.error(`Error pinging server at ${new Date().toISOString()}:`, error.message);
  }
};

// Schedule the cron job to run every 10 minutes
cron.schedule('*/10 * * * *', () => {
  console.log('Pinging Render server...');
  keepServerActive();
});

export default keepServerActive;