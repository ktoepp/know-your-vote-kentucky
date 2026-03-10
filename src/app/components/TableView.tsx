import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TablePagination, Checkbox, IconButton, Collapse, Chip, TextField, InputAdornment, Button, Tooltip, Menu, MenuItem } from '@mui/material';
import { Search, OpenInNew, ExpandMore, ExpandLess, FiberNew, HourglassEmpty, MoreVert, Visibility, Launch, ContentCopy } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';

interface Event {
  id: string;
  title: string;
  date: string;
  duration?: string | number;
  keyCharacters?: string[];
  preview_tags?: string[];
  subject?: string;
  bills?: string[];
  processing?: boolean;
  isNew?: boolean;
  summary?: string;
}

interface TableViewProps {
  events: Event[];
  onViewInGraph?: (id: string) => void;
  showPagination?: boolean;
  discoveryContext?: {
    source?: 'topic' | 'committee' | 'timeline' | 'search';
    query?: string;
    filters?: Record<string, unknown>;
  };
}

const TableView: React.FC<TableViewProps> = ({ 
  events = [], 
  onViewInGraph, 
  showPagination = true,
  discoveryContext 
}) => {
  const router = useRouter();
  const [orderBy, setOrderBy] = useState<keyof Event>('date');
  const [order] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [search, setSearch] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [speakerFilter, setSpeakerFilter] = useState<string>('');
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [billFilter, setBillFilter] = useState<string>('');
  const [selected, setSelected] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ eventId: string; anchorEl: HTMLElement } | null>(null);
  const theme = useTheme();

  // Track navigation analytics
  const trackEventNavigation = (eventId: string, source: string, context?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
      ((window as unknown as Record<string, unknown>).gtag as (command: string, eventName: string, params: Record<string, unknown>) => void)('event', 'event_detail_viewed', {
        event_id: eventId,
        source: source,
        context: context,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Helper: flatten speakers/topics/bills for filter dropdowns
  const allSpeakers = useMemo(() => Array.from(new Set(events.flatMap((e: Event) => e.keyCharacters || []))), [events]);
  const allTopics = useMemo(() => Array.from(new Set(events.flatMap((e: Event) => (e.preview_tags || (typeof e.subject === 'string' ? e.subject.split(',') : [])).map((t: string) => t.trim()).filter(Boolean)))), [events]);
  const allBills = useMemo(() => Array.from(new Set(events.flatMap((e: Event) => e.bills || []))), [events]);

  // Filter, search, sort
  const filtered = useMemo(() => events.filter((e: Event) => {
    if (speakerFilter && !(e.keyCharacters || []).includes(speakerFilter)) return false;
    const topics = e.preview_tags || (typeof e.subject === 'string' ? e.subject.split(',').map(t => t.trim()) : []);
    if (topicFilter && !topics.includes(topicFilter)) return false;
    if (billFilter && !(e.bills || []).includes(billFilter)) return false;
    if (search) {
      const text = [e.title, e.summary, ...(e.keyCharacters || []), (e.preview_tags || []).join(','), (e.bills || []).join(',')].join(' ').toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [events, speakerFilter, topicFilter, billFilter, search]);

  const sorted = useMemo(() => filtered.slice().sort((a: Event, b: Event) => {
    if (orderBy === 'date') {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      if (aDate < bDate) return order === 'asc' ? -1 : 1;
      if (aDate > bDate) return order === 'asc' ? 1 : -1;
      return 0;
    } else {
      const aVal = a[orderBy] || '';
      const bVal = b[orderBy] || '';
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    }
  }), [filtered, orderBy, order]);

  const paged = useMemo(() => sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage), [sorted, page, rowsPerPage]);

  // Table columns
  const columns = [
    { id: 'title', label: 'Title' },
    { id: 'date', label: 'Date' },
    { id: 'duration', label: 'Duration' },
    { id: 'keyCharacters', label: 'Speakers' },
    { id: 'preview_tags', label: 'Topics' },
    { id: 'bills', label: 'Bills' },
    { id: 'processing', label: 'Processing Status' },
    { id: 'actions', label: '' }
  ];

  // Enhanced row click handler with context preservation
  const handleRowClick = (eventId: string) => {
    trackEventNavigation(eventId, 'table_row_click', { 
      discoveryContext,
      filters: { speakerFilter, topicFilter, billFilter, search }
    });
    
    const eventUrl = `/events/${eventId}`;
    const queryParams = new URLSearchParams();
    
    // Preserve discovery context
    if (discoveryContext?.source) {
      queryParams.set('from', discoveryContext.source);
    }
    if (discoveryContext?.query) {
      queryParams.set('query', discoveryContext.query);
    }
    if (search) {
      queryParams.set('search', search);
    }
    if (speakerFilter) {
      queryParams.set('speaker', speakerFilter);
    }
    if (topicFilter) {
      queryParams.set('topic', topicFilter);
    }
    if (billFilter) {
      queryParams.set('bill', billFilter);
    }
    
    const finalUrl = queryParams.toString() ? `${eventUrl}?${queryParams.toString()}` : eventUrl;
    router.push(finalUrl);
  };

  // Context menu handlers
  const handleContextMenu = (event: React.MouseEvent, eventId: string) => {
    event.preventDefault();
    setContextMenu({ eventId, anchorEl: event.currentTarget as HTMLElement });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleOpenInNewTab = () => {
    if (contextMenu) {
      const eventUrl = `/events/${contextMenu.eventId}`;
      window.open(eventUrl, '_blank');
      handleContextMenuClose();
    }
  };

  const handleCopyLink = () => {
    if (contextMenu) {
      const eventUrl = `${window.location.origin}/events/${contextMenu.eventId}`;
      navigator.clipboard.writeText(eventUrl);
      handleContextMenuClose();
    }
  };

  const handleViewInGraph = () => {
    if (contextMenu && onViewInGraph) {
      onViewInGraph(contextMenu.eventId);
      handleContextMenuClose();
    }
  };

  // Expand/collapse row
  const handleExpand = (eventId: string) => {
    setExpanded(exp => ({ ...exp, [eventId]: !exp[eventId] }));
  };

  // Checkbox selection
  const handleSelect = (eventId: string) => {
    setSelected(sel => sel.includes(eventId) ? sel.filter(id => id !== eventId) : [...sel, eventId]);
  };

  // Keyboard navigation support
  const handleKeyDown = (event: React.KeyboardEvent, eventId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowClick(eventId);
    }
  };

  // Render
  return (
    <Box>
      {/* Discovery Context Banner */}
      {discoveryContext && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
          <Typography variant="body2" color="info.700">
            <strong>Discovery Context:</strong> {discoveryContext.source} 
            {discoveryContext.query && ` - "${discoveryContext.query}"`}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Event Database</Typography>
        <TextField
          size="small"
          placeholder="Search events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          sx={{ minWidth: 250 }}
          disabled={events.length === 0}
        />
        <TextField 
          select 
          size="small" 
          label="Speaker" 
          value={speakerFilter} 
          onChange={e => setSpeakerFilter(e.target.value)} 
          sx={{ minWidth: 120 }}
          disabled={allSpeakers.length === 0}
          SelectProps={{ displayEmpty: true }}
        >
          <option value="">All Speakers</option>
          {allSpeakers.length === 0 ? (
            <option value="" disabled>No speakers available</option>
          ) : (
            allSpeakers.map((s: string) => <option key={s} value={s}>{s}</option>)
          )}
        </TextField>
        <TextField 
          select 
          size="small" 
          label="Topic" 
          value={topicFilter} 
          onChange={e => setTopicFilter(e.target.value)} 
          sx={{ minWidth: 120 }}
          disabled={allTopics.length === 0}
          SelectProps={{ displayEmpty: true }}
        >
          <option value="">All Topics</option>
          {allTopics.length === 0 ? (
            <option value="" disabled>No topics available</option>
          ) : (
            allTopics.map((t: string) => <option key={t} value={t}>{t}</option>)
          )}
        </TextField>
        <TextField 
          select 
          size="small" 
          label="Bill" 
          value={billFilter} 
          onChange={e => setBillFilter(e.target.value)} 
          sx={{ minWidth: 120 }}
          disabled={allBills.length === 0}
          SelectProps={{ displayEmpty: true }}
        >
          <option value="">All Bills</option>
          {allBills.length === 0 ? (
            <option value="" disabled>No bills available</option>
          ) : (
            allBills.map((b: string) => <option key={b} value={b}>{b}</option>)
          )}
        </TextField>
      </Box>
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: theme => theme.palette.background.paper }}>
                <TableCell padding="checkbox" sx={{ fontWeight: 'bold' }}>
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < paged.length}
                    checked={paged.length > 0 && selected.length === paged.length}
                    onChange={e => setSelected(e.target.checked ? paged.map((r: Event) => r.id) : [])}
                  />
                </TableCell>
                {columns.map(col => (
                  <TableCell key={col.id} sortDirection={orderBy === col.id ? order : false} sx={{ fontWeight: 'bold', backgroundColor: theme => theme.palette.background.paper }}>
                    {col.id !== 'actions' ? (
                      <TableSortLabel
                        active={orderBy === col.id}
                        direction={orderBy === col.id ? order : 'asc'}
                        onClick={() => setOrderBy(col.id as keyof Event)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {filtered.length === 0 && events.length > 0 
                        ? 'No events match your current filters. Try adjusting your search or filters.'
                        : 'No events available.'
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((row: Event) => (
                  <React.Fragment key={row.id}>
                    <TableRow 
                      hover 
                      selected={selected.includes(row.id)}
                      onClick={() => handleRowClick(row.id)}
                      onKeyDown={(e) => handleKeyDown(e, row.id)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          '& .action-buttons': {
                            opacity: 1,
                          }
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${row.title}`}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.includes(row.id)} onChange={() => handleSelect(row.id)} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {row.title}
                          </Typography>
                          {row.isNew && <FiberNew color="primary" fontSize="small" />}
                          {row.processing && <HourglassEmpty color="warning" fontSize="small" />}
                        </Box>
                      </TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.duration}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(row.keyCharacters || []).slice(0, 2).map((speaker, index) => (
                            <Chip key={index} label={speaker} size="small" variant="outlined" />
                          ))}
                          {(row.keyCharacters || []).length > 2 && (
                            <Chip label={`+${(row.keyCharacters || []).length - 2}`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(row.preview_tags || []).slice(0, 2).map((topic, index) => (
                            <Chip key={index} label={topic} size="small" variant="outlined" color="primary" />
                          ))}
                          {(row.preview_tags || []).length > 2 && (
                            <Chip label={`+${(row.preview_tags || []).length - 2}`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(row.bills || []).slice(0, 1).map((bill, index) => (
                            <Chip key={index} label={bill} size="small" variant="outlined" color="secondary" />
                          ))}
                          {(row.bills || []).length > 1 && (
                            <Chip label={`+${(row.bills || []).length - 1}`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {row.processing ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <HourglassEmpty color="warning" fontSize="small" />
                            <Typography variant="caption">Processing</Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="success.main">Ready</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box 
                          className="action-buttons"
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            opacity: 0,
                            transition: 'opacity 0.2s'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip title="View in Graph">
                            <IconButton 
                              size="small"
                              onClick={() => onViewInGraph && onViewInGraph(row.id)}
                            >
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="More options">
                            <IconButton 
                              size="small"
                              onClick={(e) => handleContextMenu(e, row.id)}
                            >
                              <MoreVert fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <IconButton 
                            size="small"
                            onClick={() => handleExpand(row.id)}
                          >
                            {expanded[row.id] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} sx={{ p: 0, border: 0 }}>
                        <Collapse in={!!expanded[row.id]} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: theme => theme.palette.background.default }}>
                            <Typography variant="subtitle2" gutterBottom>Summary</Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>{row.summary}</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Visibility />}
                                onClick={() => handleRowClick(row.id)}
                              >
                                View Full Details
                              </Button>
                              {onViewInGraph && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<OpenInNew />}
                                  onClick={() => onViewInGraph(row.id)}
                                >
                                  View in Graph
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {showPagination && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
            <Typography variant="body2">
              Showing {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, sorted.length)} of {sorted.length} events
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                size="small"
                label="Rows per page"
                select
                value={rowsPerPage}
                onChange={e => setRowsPerPage(Number(e.target.value))}
                sx={{ width: 100, mr: 2 }}
              >
                {[10, 25, 50, 100].map((opt: number) => <option key={opt} value={opt}>{opt}</option>)}
              </TextField>
              <TablePagination
                component="div"
                count={sorted.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => setRowsPerPage(Number(e.target.value))}
                labelDisplayedRows={({ from, to, count }) => `Showing ${from}-${to} of ${count}`}
                showFirstButton
                showLastButton
                ActionsComponent={() => null}
              />
              <TextField
                size="small"
                label="Jump to page"
                type="number"
                value={page + 1}
                onChange={e => setPage(Math.max(0, Math.min(Math.ceil(sorted.length / rowsPerPage) - 1, Number(e.target.value) - 1)))}
                sx={{ width: 100, ml: 2 }}
              />
            </Box>
          </Box>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={contextMenu?.anchorEl}
        open={Boolean(contextMenu)}
        onClose={handleContextMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => contextMenu && handleRowClick(contextMenu.eventId)}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleOpenInNewTab}>
          <Launch sx={{ mr: 1 }} />
          Open in New Tab
        </MenuItem>
        <MenuItem onClick={handleCopyLink}>
          <ContentCopy sx={{ mr: 1 }} />
          Copy Link
        </MenuItem>
        {onViewInGraph && (
          <MenuItem onClick={handleViewInGraph}>
            <OpenInNew sx={{ mr: 1 }} />
            View in Graph
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default TableView; 