'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Chip, 
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link
} from '@mui/material';
import { 
  ArrowBack, 
  Person, 
  Gavel, 
  Schedule, 
  TrendingUp,
  ExpandMore,
  Description,
  History,
  Link as LinkIcon,
  CheckCircle,
  RadioButtonUnchecked,
  Circle
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useBillsData, Bill } from '../../lib/useBillsData';
import { LegislativeProcess, LegislativeStage } from '../../components/LegislativeProcess';
import { useTheme } from '@mui/material/styles';

interface BillDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Utility function to format bill number with prefix
const formatBillNumber = (bill: Bill) => {
  if (!bill.number) return 'Unknown Bill';
  const prefix = bill.chamber === 'senate' ? 'S.' : 'H.R.';
  return `${prefix} ${bill.number}`;
};

// Convert bill data to legislative stages
const convertBillToLegislativeStages = (bill: Bill): LegislativeStage[] => {
  const stages: LegislativeStage[] = [
    {
      id: 'introduced',
      name: 'Introduced',
      status: 'completed',
      date: bill.introduced_date,
      description: 'Bill introduced in Congress',
      actions: bill.actions?.filter(a => a.text.toLowerCase().includes('introduced')).map(a => ({
        date: a.actionDate,
        text: a.text,
        chamber: a.chamber,
        actionBy: a.actionBy
      }))
    },
    {
      id: 'committee',
      name: 'Committee',
      status: 'upcoming',
      description: 'Under committee consideration',
      committee: bill.committees?.[0],
      actions: bill.actions?.filter(a => a.text.toLowerCase().includes('committee') && !a.text.toLowerCase().includes('markup')).map(a => ({
        date: a.actionDate,
        text: a.text,
        chamber: a.chamber,
        actionBy: a.actionBy
      }))
    },
    {
      id: 'markup',
      name: 'Markup',
      status: 'upcoming',
      description: 'Committee markup and amendments',
      actions: bill.actions?.filter(a => a.text.toLowerCase().includes('markup')).map(a => ({
        date: a.actionDate,
        text: a.text,
        chamber: a.chamber,
        actionBy: a.actionBy
      }))
    },
    {
      id: 'calendar',
      name: 'Calendar',
      status: 'upcoming',
      description: 'Placed on legislative calendar',
      actions: bill.actions?.filter(a => a.text.toLowerCase().includes('calendar')).map(a => ({
        date: a.actionDate,
        text: a.text,
        chamber: a.chamber,
        actionBy: a.actionBy
      }))
    },
    {
      id: 'floor',
      name: 'Floor',
      status: 'upcoming',
      description: 'Floor debate and vote',
      actions: bill.actions?.filter(a => a.text.toLowerCase().includes('floor') || a.text.toLowerCase().includes('vote')).map(a => ({
        date: a.actionDate,
        text: a.text,
        chamber: a.chamber,
        actionBy: a.actionBy
      }))
    },
    {
      id: 'passed',
      name: 'Passed',
      status: 'upcoming',
      description: 'Bill passed by chamber',
      actions: bill.actions?.filter(a => a.text.toLowerCase().includes('passed') || a.text.toLowerCase().includes('approved')).map(a => ({
        date: a.actionDate,
        text: a.text,
        chamber: a.chamber,
        actionBy: a.actionBy
      }))
    },
    {
      id: 'signed',
      name: 'Signed',
      status: 'upcoming',
      description: 'Bill signed into law',
      actions: bill.actions?.filter(a => a.text.toLowerCase().includes('enacted') || a.text.toLowerCase().includes('signed')).map(a => ({
        date: a.actionDate,
        text: a.text,
        chamber: a.chamber,
        actionBy: a.actionBy
      }))
    }
  ];

  // Determine current stage based on last action
  const lastAction = bill.last_action?.toLowerCase() || '';
  if (lastAction.includes('enacted') || lastAction.includes('signed')) {
    stages[6].status = 'completed';
  } else if (lastAction.includes('passed') || lastAction.includes('approved')) {
    stages[5].status = 'current';
  } else if (lastAction.includes('floor') || lastAction.includes('vote')) {
    stages[4].status = 'current';
  } else if (lastAction.includes('calendar')) {
    stages[3].status = 'current';
  } else if (lastAction.includes('markup')) {
    stages[2].status = 'current';
  } else if (lastAction.includes('committee')) {
    stages[1].status = 'current';
  }

  return stages;
};

export default function BillDetailPage({ params }: BillDetailPageProps) {
  const router = useRouter();
  const { bills, loading, error } = useBillsData();
  const [bill, setBill] = useState<Bill | null>(null);
  
  // Unwrap params using React.use()
  const resolvedParams = React.use(params);
  const billId = resolvedParams.id;

  const theme = useTheme();

  useEffect(() => {
    if (bills.length > 0) {
      const foundBill = bills.find(b => 
        b.id === billId || 
        b.number === billId ||
        b.number?.replace(/\s+/g, '') === billId.replace(/\s+/g, '')
      );
      setBill(foundBill || null);
    }
  }, [bills, billId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUrgencyColor = (priority?: number) => {
    if (!priority) return 'default';
    if (priority >= 8) return 'error';
    if (priority >= 6) return 'warning';
    return 'success';
  };

  // Extract party from sponsor name (simplified)
  const getSponsorInfo = (sponsorName: string) => {
    const nameParts = sponsorName.split(' ');
    const lastName = nameParts[nameParts.length - 1];
    const party = lastName.includes('(D)') ? 'D' : lastName.includes('(R)') ? 'R' : 'I';
    const name = sponsorName.replace(/\([DR]\)/g, '').trim();
    return { name, party };
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  if (!bill) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">
            Bill not found. The bill may have been removed or the ID is incorrect.
          </Alert>
          <Button 
            startIcon={<ArrowBack />} 
            onClick={() => router.back()}
            sx={{ mt: 2 }}
          >
            Go Back
          </Button>
        </Container>
      </Box>
    );
  }

  const formattedBillNumber = formatBillNumber(bill);
  const sponsorInfo = bill.sponsor ? getSponsorInfo(bill.sponsor) : null;

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: 'background.default',
      color: 'text.primary'
    }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* Back Button */}
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => router.back()}
          sx={{ mb: 2 }}
        >
          Back to Bills
        </Button>

        {/* Bill Header */}
        <Card sx={{ mb: 3, borderRadius: 2, backgroundColor: 'background.paper' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {formattedBillNumber}
              </Typography>
              {bill.priority && (
                <Chip
                  icon={<TrendingUp />}
                  label={`Priority ${bill.priority}`}
                  color={getUrgencyColor(bill.priority) as any}
                  size="medium"
                />
              )}
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, lineHeight: 1.4, color: 'text.primary' }}>
              {bill.title}
            </Typography>

            {/* Enhanced Timeline */}
            <LegislativeProcess 
              stages={convertBillToLegislativeStages(bill)} 
              billNumber={formatBillNumber(bill)}
              billTitle={bill.title}
              showDetails={true}
            />

            {/* Interactive Metadata Chips */}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {sponsorInfo && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Sponsor</Typography>
                    <Chip
                      label={`${sponsorInfo.name} [${sponsorInfo.party}]`}
                      size="small"
                      color={sponsorInfo.party === 'D' ? 'primary' : sponsorInfo.party === 'R' ? 'error' : 'warning'}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 }
                      }}
                      onClick={() => router.push(`/members?search=${sponsorInfo.name}`)}
                    />
                  </Box>
                </Box>
              )}

              {bill.committees && bill.committees.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Gavel sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Committee</Typography>
                    <Chip
                      label={bill.committees[0]}
                      size="small"
                      sx={{ 
                        backgroundColor: theme.palette.action.hover,
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                        fontSize: '0.7rem',
                        height: 24,
                        borderRadius: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: theme.palette.action.selected,
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }
                      }}
                      onClick={() => router.push(`/bills?committee=${bill.committees![0]}`)}
                    />
                  </Box>
                </Box>
              )}

              {bill.introduced_date && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Introduced</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {formatDate(bill.introduced_date)}
                    </Typography>
                  </Box>
                </Box>
              )}

              {bill.chamber && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Gavel sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Chamber</Typography>
                    <Chip
                      label={bill.chamber === 'senate' ? 'Senate' : 'House'}
                      size="small"
                      color={bill.chamber === 'senate' ? 'error' : 'success'}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 }
                      }}
                      onClick={() => router.push(`/bills?chamber=${bill.chamber}`)}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Actions Timeline */}
        {bill.actions && bill.actions.length > 0 && (
          <Card sx={{ mb: 3, borderRadius: 2, backgroundColor: 'background.paper' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                <History sx={{ fontSize: '1.2rem' }} />
                Legislative Actions
              </Typography>
              <List sx={{ p: 0 }}>
                {bill.actions.map((action, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0, py: 1.5 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          backgroundColor: 'primary.main' 
                        }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={action.text}
                        secondary={action.actionDate ? formatDate(action.actionDate) : 'Unknown date'}
                        primaryTypographyProps={{ sx: { fontWeight: 500, color: 'text.primary' } }}
                        secondaryTypographyProps={{ sx: { fontSize: '0.8rem', color: 'text.secondary' } }}
                      />
                    </ListItem>
                    {index < bill.actions!.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Related Content */}
        <Accordion sx={{ borderRadius: 2, mb: 2, backgroundColor: 'background.paper' }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
              <LinkIcon sx={{ fontSize: '1.2rem' }} />
              Related Content
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              Related videos, events, and other bills will appear here as they are linked to this legislation.
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Full Text */}
        <Accordion sx={{ borderRadius: 2, backgroundColor: 'background.paper' }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
              <Description sx={{ fontSize: '1.2rem' }} />
              Bill Summary & Text
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              Full bill text and detailed summary will be available here when the bill is fully processed.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Container>
    </Box>
  );
} 