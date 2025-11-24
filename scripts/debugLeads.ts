// Debug script to print all leads for a given user and event
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scan2card';

const teamManagerId = process.argv[2]; // Pass teamManagerId as first argument

if (!teamManagerId) {
  console.error('Usage: ts-node debugLeads.ts <teamManagerId>');
  process.exit(1);
}

const Lead = require('../src/models/leads.model').default;
const Event = require('../src/models/event.model').default;

async function main() {
  await mongoose.connect(MONGO_URI);
  // Find all events managed by this team manager
  const managedEvents = await Event.find({
    'licenseKeys.teamManagerId': teamManagerId,
    isDeleted: false,
  });
  const managedEventIds = managedEvents.map((e: any) => e._id);
  if (managedEventIds.length === 0) {
    console.log('No events found for this team manager.');
    await mongoose.disconnect();
    return;
  }
  // Find all leads for these events
  const leads = await Lead.find({ eventId: { $in: managedEventIds }, isDeleted: false }).lean();
  console.log(`Found ${leads.length} leads for events managed by team manager ${teamManagerId}`);
  leads.forEach((lead: any, i: number) => {
    console.log(`Lead #${i + 1}:`, JSON.stringify(lead, null, 2));
  });
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
