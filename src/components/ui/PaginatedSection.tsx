'use client';

import React, { useId, useState, useEffect, useMemo } from 'react';
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  type SelectChangeEvent,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

export type PaginatedSectionVariant = 'pagination' | 'gallery' | 'responsive';

export interface PaginatedSectionProps<T> {
  items: readonly T[];
  pageSize: number;
  /** When this string changes, the current page resets to 1 (e.g. bill ids or filter fingerprint). */
  resetKey?: string;
  /**
   * Optional 24/48/96 (or other) control; pair with `onPageSizeChange` for persisted prefs from the parent.
   */
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (n: number) => void;
  /**
   * pagination — numbered pages only.
   * gallery — prev/next + dot indicators (compact “carousel” control).
   * responsive — gallery on xs/sm, pagination from md up.
   */
  variant?: PaginatedSectionVariant;
  children: (pageItems: T[]) => React.ReactNode;
}

export function PaginatedSection<T>({
  items,
  pageSize,
  resetKey = '',
  pageSizeOptions,
  onPageSizeChange,
  variant = 'pagination',
  children,
}: PaginatedSectionProps<T>) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const pageSizeLabelId = useId();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const showPager = items.length > pageSize;
  const showPageSizeSelect =
    Boolean(pageSizeOptions?.length) && typeof onPageSizeChange === 'function';

  const handlePageSizeSelect = (e: SelectChangeEvent<number | string>) => {
    onPageSizeChange?.(parseInt(String(e.target.value), 10));
  };

  /** Dot stepper is only practical for a small page count; otherwise use numbered pages. */
  const maxDotPages = 12;
  const wantsDotGallery = variant === 'gallery' || (variant === 'responsive' && !isMdUp);
  const showDotGallery = wantsDotGallery && totalPages <= maxDotPages;
  const showNumberedPagination =
    variant === 'pagination' || (variant === 'responsive' && isMdUp) || !showDotGallery;

  return (
    <Box>
      {showPageSizeSelect && items.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            mb: 1.5,
          }}
        >
          <FormControl size="small" sx={{ minWidth: 130 }} variant="outlined">
            <InputLabel id={pageSizeLabelId}>Per page</InputLabel>
            <Select
              labelId={pageSizeLabelId}
              label="Per page"
              value={pageSize}
              onChange={handlePageSizeSelect}
            >
              {(pageSizeOptions ?? []).map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      {children(pageItems)}
      {showPager && (
        <Box
          component="nav"
          aria-label="Paged results"
          sx={{
            mt: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {showDotGallery && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 0.5, sm: 1 },
                width: '100%',
                maxWidth: 420,
              }}
            >
              <IconButton
                aria-label="Previous page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                size="small"
                color="primary"
              >
                <KeyboardArrowLeft />
              </IconButton>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.75,
                  flexWrap: 'wrap',
                  flex: 1,
                  minHeight: 32,
                }}
              >
                {Array.from({ length: totalPages }, (_, i) => {
                  const n = i + 1;
                  const active = n === page;
                  return (
                    <Box
                      key={n}
                      component="button"
                      type="button"
                      onClick={() => setPage(n)}
                      aria-label={`Page ${n} of ${totalPages}`}
                      aria-current={active ? 'true' : undefined}
                      sx={{
                        width: active ? 10 : 8,
                        height: active ? 10 : 8,
                        borderRadius: '50%',
                        border: 'none',
                        p: 0,
                        cursor: 'pointer',
                        bgcolor: active ? 'primary.main' : 'action.disabledBackground',
                        transition: 'transform 0.15s, background-color 0.15s',
                        '&:hover': {
                          bgcolor: active ? 'primary.dark' : 'action.hover',
                          transform: 'scale(1.08)',
                        },
                      }}
                    />
                  );
                })}
              </Box>
              <IconButton
                aria-label="Next page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                size="small"
                color="primary"
              >
                <KeyboardArrowRight />
              </IconButton>
            </Box>
          )}
          {showDotGallery && (
            <Typography variant="caption" color="text.secondary">
              Page {page} of {totalPages}
            </Typography>
          )}
          {showNumberedPagination && (
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              size={isMdUp ? 'medium' : 'small'}
              showFirstButton={totalPages > 5}
              showLastButton={totalPages > 5}
              sx={{ '& .MuiPagination-ul': { flexWrap: 'wrap', justifyContent: 'center' } }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
