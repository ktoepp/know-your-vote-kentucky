/**
 * Seed test data — shared logic for CLI and API
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SAMPLE_BILLS = [
  { legiscan_id: 99001, bill_number: 'HB 1', title: 'An act relating to education funding', description: 'Appropriates funds for K-12 education', chamber: 'house', status: 'In Committee', last_action_date: '2025-02-15', last_action: 'Referred to Education Committee', session: '2025 Regular Session', source: 'seed' },
  { legiscan_id: 99002, bill_number: 'SB 42', title: 'An act relating to healthcare access', description: 'Expands Medicaid eligibility for certain populations', chamber: 'senate', status: 'Passed Senate', last_action_date: '2025-02-20', last_action: 'Third reading passed', session: '2025 Regular Session', source: 'seed' },
  { legiscan_id: 99003, bill_number: 'HB 156', title: 'An act relating to infrastructure', description: 'Authorizes bonding for road and bridge improvements', chamber: 'house', status: 'In Committee', last_action_date: '2025-02-10', last_action: 'First reading', session: '2025 Regular Session', source: 'seed' },
  { legiscan_id: 99004, bill_number: 'SB 88', title: 'An act relating to criminal justice', description: 'Reforms bail and pretrial detention procedures', chamber: 'senate', status: 'Passed House', last_action_date: '2025-02-25', last_action: 'Received in House', session: '2025 Regular Session', source: 'seed' },
  { legiscan_id: 99005, bill_number: 'HB 203', title: 'An act relating to renewable energy', description: 'Establishes incentives for solar and wind development', chamber: 'house', status: 'In Committee', last_action_date: '2025-02-18', last_action: 'Referred to Natural Resources', session: '2025 Regular Session', source: 'seed' },
  { legiscan_id: 99006, bill_number: 'SB 12', title: 'An act relating to voting rights', description: 'Expands early voting and absentee ballot access', chamber: 'senate', status: 'Failed', last_action_date: '2025-02-22', last_action: 'Defeated on floor', session: '2025 Regular Session', source: 'seed' },
];

const SAMPLE_ORDINANCES = [
  { legistar_id: 88001, jurisdiction: 'louisville', ordinance_number: 'O-45-2025', title: 'Ordinance approving zoning change for downtown development', status: 'Adopted', introduced_date: '2025-01-15', adopted_date: '2025-02-01' },
  { legistar_id: 88002, jurisdiction: 'louisville', ordinance_number: 'O-52-2025', title: 'Ordinance establishing sidewalk maintenance requirements', status: 'In Committee', introduced_date: '2025-02-10', adopted_date: null },
  { legistar_id: 88003, jurisdiction: 'lexington', ordinance_number: '2025-0123', title: 'Ordinance amending noise ordinance for entertainment districts', status: 'Adopted', introduced_date: '2025-01-20', adopted_date: '2025-02-05' },
  { legistar_id: 88004, jurisdiction: 'lexington', ordinance_number: '2025-0156', title: 'Ordinance regarding short-term rental regulations', status: 'First Reading', introduced_date: '2025-02-15', adopted_date: null },
];

const SAMPLE_EXECUTIVE_ORDERS = [
  { eo_number: '2025-001', title: 'Executive Order Establishing Task Force on Economic Development', signed_date: '2025-01-10', governor: 'Andy Beshear', full_text_url: null },
  { eo_number: '2025-002', title: 'Executive Order Declaring State of Emergency for Winter Weather', signed_date: '2025-01-25', governor: 'Andy Beshear', full_text_url: null },
  { eo_number: '2025-003', title: 'Executive Order on Workforce Development Initiatives', signed_date: '2025-02-01', governor: 'Andy Beshear', full_text_url: null },
];

const SAMPLE_SCHOOL_BOARD = [
  { district: 'jcps', title: 'Approval of 2025-2026 school calendar', meeting_date: '2025-02-12', category: 'Policy', vote_result: 'Approved 6-1' },
  { district: 'jcps', title: 'Budget amendment for facility repairs', meeting_date: '2025-02-12', category: 'Budget', vote_result: 'Approved 7-0' },
  { district: 'fcps', title: 'New curriculum adoption for science', meeting_date: '2025-02-18', category: 'Curriculum', vote_result: 'Approved 5-2' },
  { district: 'fcps', title: 'Contract for transportation services', meeting_date: '2025-02-18', category: 'Contracts', vote_result: 'Approved 6-1' },
];

const SAMPLE_LEGISLATORS = [
  { legiscan_id: 77001, openstates_id: 'seed-smith', name: 'Rep. Jane Smith', first_name: 'Jane', last_name: 'Smith', party: 'D', chamber: 'house', district: '41', active: true },
  { legiscan_id: 77002, openstates_id: 'seed-davis', name: 'Sen. John Davis', first_name: 'John', last_name: 'Davis', party: 'R', chamber: 'senate', district: '22', active: true },
  { legiscan_id: 77003, openstates_id: 'seed-garcia', name: 'Rep. Maria Garcia', first_name: 'Maria', last_name: 'Garcia', party: 'D', chamber: 'house', district: '63', active: true },
  { legiscan_id: 77004, openstates_id: 'seed-wilson', name: 'Sen. Robert Wilson', first_name: 'Robert', last_name: 'Wilson', party: 'R', chamber: 'senate', district: '8', active: true },
];

export interface SeedResult {
  bills: number;
  ordinances: number;
  executiveOrders: number;
  schoolBoard: number;
  legislators: number;
  total: number;
  errors: string[];
}

export async function runSeed(supabase: SupabaseClient): Promise<SeedResult> {
  const errors: string[] = [];
  let bills = 0, ordinances = 0, executiveOrders = 0, schoolBoard = 0, legislators = 0;

  const { error: billsErr } = await supabase.from('ky_bills').upsert(SAMPLE_BILLS, { onConflict: 'legiscan_id' });
  if (billsErr) errors.push(`Bills: ${billsErr.message}`);
  else bills = SAMPLE_BILLS.length;

  const { error: ordErr } = await supabase.from('ky_ordinances').upsert(SAMPLE_ORDINANCES, { onConflict: 'legistar_id' });
  if (ordErr) errors.push(`Ordinances: ${ordErr.message}`);
  else ordinances = SAMPLE_ORDINANCES.length;

  const { error: eoErr } = await supabase.from('ky_executive_orders').upsert(SAMPLE_EXECUTIVE_ORDERS, { onConflict: 'eo_number' });
  if (eoErr) errors.push(`Executive Orders: ${eoErr.message}`);
  else executiveOrders = SAMPLE_EXECUTIVE_ORDERS.length;

  for (const item of SAMPLE_SCHOOL_BOARD) {
    const { error } = await supabase.from('ky_school_board_items').insert(item);
    if (!error) schoolBoard++;
    else errors.push(`School Board: ${error.message}`);
  }

  const { error: legErr } = await supabase.from('ky_legislators').upsert(SAMPLE_LEGISLATORS, { onConflict: 'legiscan_id' });
  if (legErr) errors.push(`Legislators: ${legErr.message}`);
  else legislators = SAMPLE_LEGISLATORS.length;

  return {
    bills,
    ordinances,
    executiveOrders,
    schoolBoard,
    legislators,
    total: bills + ordinances + executiveOrders + schoolBoard + legislators,
    errors,
  };
}
