/**
 * Kentucky Data Sources — Unified Entry Point
 *
 * Re-exports all KY civic data source clients for the sync pipeline.
 *
 * Required environment variables:
 *   LEGISCAN_API_KEY     — LegiScan API key (legiscan.com)
 *   OPENSTATES_API_KEY   — Open States API key (openstates.org)
 *
 * No API keys needed for:
 *   - LRC Legislative Calendar (planned — docs/specs/committee-calendar.md)
 *
 * Paused from Vercel Cron / default syncAll (2026-05-18); manual ?source= still works:
 *   - Legistar (Louisville/Lexington ordinances)
 *   - School Boards (JCPS/FCPS scraper)
 *   - County meetings (Jefferson / Fayette Legistar calendars)
 *   - Governor Executive Orders (unreliable listing; not in SYNC_SOURCES)
 */

import { getKyCountyCourtsClient } from './ky-county-courts';
import { getKyLegiScanClient } from './ky-legiscan-client';
import { getKyLegistarClient } from './ky-legistar-client';
import { getKyOpenStatesClient } from './ky-openstates-client';
import { getKySchoolBoardsClient } from './ky-school-boards';

// --- LegiScan (primary KY legislature data) ---
export {
  KyLegiScanClient,
  getKyLegiScanClient,
  type LegiScanSession,
  type LegiScanBillSummary,
  type LegiScanBillDetail,
  type LegiScanVote,
  type LegiScanSearchResult,
  type LegiScanSponsor,
  type LegiScanHistoryEntry,
  type LegiScanVoteSummary,
} from './ky-legiscan-client';

// --- Open States (fallback legislature data) ---
export {
  KyOpenStatesClient,
  getKyOpenStatesClient,
  type OpenStatesBill,
  type OpenStatesLegislator,
} from './ky-openstates-client';

// --- Legistar (Louisville + Lexington local government) ---
export {
  KyLegistarClient,
  getKyLegistarClient,
  type LegistarOrdinance,
  type LegistarMeeting,
  type LegistarEventItem,
  type LegistarJurisdiction,
  type LocalGovDataSource,
} from './ky-legistar-client';

// --- Governor Executive Orders ---
export {
  KyExecutiveOrdersClient,
  getKyExecutiveOrdersClient,
  type ExecutiveOrder,
  type ExecutiveOrderDetail,
} from './ky-executive-orders';

// --- School Boards (JCPS + FCPS) ---
export {
  KySchoolBoardsClient,
  getKySchoolBoardsClient,
  type SchoolBoardItem,
  type SchoolBoardItemDetail,
  type SchoolDistrict,
} from './ky-school-boards';

// --- County Fiscal Courts (stretch) ---
export {
  KyCountyCourtsClient,
  getKyCountyCourtsClient,
  type CountyAction,
  type CountyActionDetail,
  type CountyName,
} from './ky-county-courts';

/**
 * Get all data source client instances.
 * Useful for the sync pipeline to iterate over all sources.
 */
export function getAllKyDataSources() {
  return {
    legiscan: getKyLegiScanClient(),
    openstates: getKyOpenStatesClient(),
    legistar: getKyLegistarClient(),
    schoolBoards: getKySchoolBoardsClient(),
    countyCourts: getKyCountyCourtsClient(),
  };
}

