"use client";
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Refresh,
  Link,
  TrendingUp,
  Person,
  Business,
  Receipt,
  Event,
  ExpandMore,
  Visibility,
  Analytics,
} from '@mui/icons-material';
import { useEventBillLinks, EventBillLink } from '../lib/useEventBillLinks';
import { useBillsData } from '../lib/useBillsData';

export default function LinkDashboardPage() {
  const { 
    links, 
    stats, 
    updated, 
    loading, 
    error, 
    refresh, 
    generateLinks,
    getHighConfidenceLinks,
    getLinksByType
  } = useEventBillLinks();
  
  const { bills } = useBillsData();
  const [generating, setGenerating] = useState(false);

  const handleGenerateLinks = async () => {
    setGenerating(true);
    try {
      await generateLinks();
    } finally {
      setGenerating(false);
    }
  };

  const getRelationshipIcon = (type: EventBillLink['relationshipType']) => {
    switch (type) {
      case 'mentioned': return <Receipt />;
      case 'action': return <Link />;
      case 'topic': return <TrendingUp />;
      case 'sponsor': return <Person />;
      case 'committee': return <Business />;
      default: return <Link />;
    }
  };

  const getRelationshipColor = (type: EventBillLink['relationshipType']) => {
    switch (type) {
      case 'mentioned': return 'primary';
      case 'action': return 'success';
      case 'topic': return 'warning';
      case 'sponsor': return 'info';
      case 'committee': return 'secondary';
      default: return 'default';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const highConfidenceLinks = getHighConfidenceLinks(70);
  const actionLinks = getLinksByType('action');
  const mentionLinks = getLinksByType('mentioned');

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        Event-Bill Link Dashboard
      </Typography>
      
      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            Link Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={refresh}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Link />}
              onClick={handleGenerateLinks}
              disabled={generating || loading}
            >
              {generating ? 'Generating...' : 'Generate Links'}
            </Button>
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Typography variant="body2" color="text.secondary">
          Last updated: {updated ? new Date(updated).toLocaleString() : 'Never'}
        </Typography>
      </Paper>

      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Total Links
                </Typography>
                <Typography variant="h4" component="div">
                  {stats?.totalLinks || 0}
                </Typography>
              </Box>
              <Link color="primary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  High Confidence
                </Typography>
                <Typography variant="h4" component="div">
                  {highConfidenceLinks.length}
                </Typography>
              </Box>
              <TrendingUp color="success" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Action Links
                </Typography>
                <Typography variant="h4" component="div">
                  {actionLinks.length}
                </Typography>
              </Box>
              <Event color="info" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Mention Links
                </Typography>
                <Typography variant="h4" component="div">
                  {mentionLinks.length}
                </Typography>
              </Box>
              <Receipt color="warning" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Detailed Statistics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Link Types Distribution
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {['mentioned', 'action', 'topic', 'sponsor', 'committee'].map(type => {
              const typeLinks = getLinksByType(type as EventBillLink['relationshipType']);
              const percentage = links.length > 0 ? (typeLinks.length / links.length * 100).toFixed(1) : '0';
              
              return (
                <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRelationshipIcon(type as EventBillLink['relationshipType'])}
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {type}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {typeLinks.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({percentage}%)
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Confidence Distribution
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { range: '80-100%', min: 80, color: 'success' },
              { range: '60-79%', min: 60, max: 79, color: 'warning' },
              { range: '40-59%', min: 40, max: 59, color: 'error' },
              { range: '0-39%', max: 39, color: 'default' }
            ].map(({ range, min, max, color }) => {
              const count = links.filter(link => {
                if (min !== undefined && max !== undefined) {
                  return link.confidence >= min && link.confidence <= max;
                } else if (min !== undefined) {
                  return link.confidence >= min;
                } else if (max !== undefined) {
                  return link.confidence <= max;
                }
                return false;
              }).length;
              
              const percentage = links.length > 0 ? (count / links.length * 100).toFixed(1) : '0';
              
              return (
                <Box key={range} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip label={range} size="small" color={color as any} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({percentage}%)
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Box>

      {/* Sample Links Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sample Links ({links.length} total)
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bill Number</TableCell>
                  <TableCell>Event ID</TableCell>
                  <TableCell>Relationship Type</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Evidence</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {links.slice(0, 20).map((link, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {link.billNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {link.eventId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getRelationshipIcon(link.relationshipType)}
                        label={link.relationshipType}
                        size="small"
                        color={getRelationshipColor(link.relationshipType)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${link.confidence}%`}
                        size="small"
                        color={getConfidenceColor(link.confidence)}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={link.evidence.join(', ')}>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {link.evidence.slice(0, 2).join(', ')}
                          {link.evidence.length > 2 && '...'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(link.lastUpdated).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
} 