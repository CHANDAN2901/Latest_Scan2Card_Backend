import { Request, Response } from 'express';
import { getLeads } from '../services/lead.service';
import mongoose from 'mongoose';

interface ExportQueryParams {
  type: 'all' | 'entryOnly';
  eventId?: string;
  search?: string;
  rating?: number;
}

const exportLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, eventId, search, rating } = req.query as any;
    const userId = (req as any).user?.userId || (req as any).user?._id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Build query parameters for the getLeads function
    const queryParams: any = {
      userId,
      userRole,
      limit: '1000', // Export all records (must be string)
    };

    if (eventId && eventId !== 'all') {
      queryParams.eventId = eventId;
    }

    if (search) {
      queryParams.search = search;
    }

    if (rating) {
      queryParams.rating = rating.toString();
    }

    // Get leads data
    const result = await getLeads(queryParams);
    const leads = result.leads;

    // Filter leads based on export type
    let filteredLeads = leads;
    if (type === 'entryOnly') {
      // Only include leads that have entry codes
      filteredLeads = leads.filter((lead: any) => lead.entryCode && lead.entryCode.trim() !== '');
    }

    // Generate CSV content based on export type
    let csvContent: string;
    let filename: string;

    if (type === 'entryOnly') {
      // Entry Code only export
      csvContent = generateEntryCodeCSV(filteredLeads);
      filename = `entry-codes-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // Full data export
      csvContent = generateFullDataCSV(filteredLeads);
      filename = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(csvContent);
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export leads data'
    });
  }
};

const generateEntryCodeCSV = (leads: any[]): string => {
  const headers = ['Entry Code'];
  const rows = leads.map(lead => [lead.entryCode]);

  return generateCSV(headers, rows);
};

const generateFullDataCSV = (leads: any[]): string => {
  const headers = [
    'Entry Code',
    'First Name',
    'Last Name',
    'Company',
    'Position',
    'Email',
    'Phone Number',
    'Website',
    'City',
    'Country',
    'Notes',
    'Event',
    'Lead Type',
    'Rating',
    'Created Date'
  ];

  const rows = leads.map(lead => [
    lead.entryCode || '',
    lead.details?.firstName || '',
    lead.details?.lastName || '',
    lead.details?.company || '',
    lead.details?.position || '',
    lead.details?.email || '',
    lead.details?.phoneNumber || '',
    lead.details?.website || '',
    lead.details?.city || '',
    lead.details?.country || '',
    lead.details?.notes || '',
    lead.eventId && typeof lead.eventId === 'object' ? lead.eventId.eventName : (lead.isIndependentLead ? 'Independent' : ''),
    lead.leadType || '',
    lead.rating || '',
    new Date(lead.createdAt).toLocaleDateString()
  ]);

  return generateCSV(headers, rows);
};

const generateCSV = (headers: string[], rows: string[][]): string => {
  // Escape CSV values and combine with commas
  const csvRows = [
    headers.map(escapeCSVValue).join(','),
    ...rows.map(row => row.map(escapeCSVValue).join(','))
  ];

  return csvRows.join('\n');
};

const escapeCSVValue = (value: string): string => {
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string
  let stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
  }

  return stringValue;
};

export default {
  exportLeads
};