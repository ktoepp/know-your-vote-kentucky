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
 *   - Legistar (Louisville/Lexington)
 *   - Governor Executive Orders (web scraper)
 *   - School Boards (web scraper)
 *   - County meetings (Jefferson / Fayette via Legistar public calendars)
 */

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
  const { getKyLegiScanClient: legiscan } = require('./ky-legiscan-client');
  const { getKyOpenStatesClient: openstates } = require('./ky-openstates-client');
  const { getKyLegistarClient: legistar } = require('./ky-legistar-client');
  const { getKySchoolBoardsClient: schools } = require('./ky-school-boards');
  const { getKyCountyCourtsClient: courts } = require('./ky-county-courts');

  return {
    legiscan: legiscan(),
    openstates: openstates(),
    legistar: legistar(),
    schoolBoards: schools(),
    countyCourts: courts(),
  };
}

