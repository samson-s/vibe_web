'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Input, Stack, Heading, Table, Dialog, Field, Alert, Flex, NativeSelect, Text, HStack, Tag, Spinner, Badge,
} from '@chakra-ui/react';
import { Upload, FileText, Check, X, AlertTriangle, Pencil, ArrowLeft, Send, Plus, ExternalLink, RotateCcw, Clock, Zap } from 'lucide-react';
import { listExtractions, uploadForExtraction, getExtractionDocument, retryExtraction, abortExtraction, type ExtractionJob, type ExtractionDocument, type ExtractedVendorBillData } from '@/services/extractions';
import { createVendorBill, type CreateVendorBillRequest, type CreateLineItemRequest } from '@/services/vendorBills';
import { listVendors, createVendor, type Vendor } from '@/services/vendors';
import { useRouter } from 'next/navigation';

type Step = 'upload' | 'extracting' | 'review' | 'creating' | 'done';

const statusColors: Record<string, string> = { pending: 'gray', processing: 'blue', completed: 'green', failed: 'red' };

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload Files' },
  { key: 'extracting', label: 'Extract Data' },
  { key: 'review', label: 'Review & Edit' },
  { key: 'creating', label: 'Confirm' },
];

const fieldStyle = {
  bg: '#0c0c17',
  border: '1px solid',
  borderColor: '#1e1e35',
  color: 'gray.100',
  _placeholder: { color: 'gray.700' },
  _focus: { borderColor: 'violet.600', boxShadow: '0 0 0 1px #7c3aed' },
  _hover: { borderColor: '#2a2a45' },
  borderRadius: 'lg',
} as const;

export default function MassUploadVendorBillPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [job, setJob] = useState<ExtractionJob | null>(null);
  const [error, setError] = useState('');
  const [editDoc, setEditDoc] = useState<ExtractionDocument | null>(null);
  const [editForm, setEditForm] = useState<CreateVendorBillRequest & { items: CreateLineItemRequest[] }>({
    bill_number: '', vendor_id: '', amount: 0, tax: 0, status: 'pending', description: '', due_date: '', items: [],
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [aborting, setAborting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [recentJobs, setRecentJobs] = useState<ExtractionJob[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const pollingRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listVendors().then(setVendors).catch(() => { });
    listExtractions()
      .then((jobs) => setRecentJobs(jobs.slice(0, 5)))
      .catch(() => { })
      .finally(() => setLoadingRecent(false));
  }, []);

  const addFiles = (incoming: File[]) => {
    const accepted = incoming.filter((f) => f.type === 'application/pdf' || f.type.startsWith('image/'));
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...accepted.filter((f) => !existingNames.has(f.name))];
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ''; }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (idx: number) => setFiles(files.filter((_, i) => i !== idx));

  const handleUpload = async () => {
    if (files.length === 0) return;
    setError(''); setStep('extracting');
    try {
      const result = await uploadForExtraction(files);
      setJob(result);
      pollJob(result.id, result.documents);
    } catch {
      setError('Failed to upload files for extraction'); setStep('upload');
    }
  };

  const handleAbort = async () => {
    if (!job) return;
    setAborting(true); pollingRef.current = false;
    try { const updated = await abortExtraction(job.id); setJob(updated); }
    catch { setError('Failed to abort extraction.'); }
    setAborting(false); setStep('review');
  };

  const handleRetry = async () => {
    if (!job) return;
    try {
      pollingRef.current = false;
      await new Promise((r) => setTimeout(r, 500));
      const updated = await retryExtraction(job.id);
      setJob(updated); pollingRef.current = true;
      pollJob(job.id, updated.documents); setStep('extracting');
    } catch { setError('Failed to retry extraction.'); }
  };

  const pollJob = async (jobId: string, docs: ExtractionDocument[]) => {
    pollingRef.current = true;
    for (let i = 0; i < 120; i++) {
      if (!pollingRef.current) return;
      await new Promise((r) => setTimeout(r, 2000));
      if (!pollingRef.current) return;
      try {
        const updatedDocs = await Promise.all(docs.map((d) => getExtractionDocument(d.id)));
        setJob((prev) => prev ? { ...prev, documents: updatedDocs } : null);
        if (updatedDocs.every((d) => d.status === 'completed' || d.status === 'failed')) { setStep('review'); return; }
      } catch { /* continue */ }
    }
    setError('Extraction timed out.'); setStep('review');
  };

  const completedDocs = job?.documents.filter((d) => d.status === 'completed') ?? [];
  const failedDocs = job?.documents.filter((d) => d.status === 'failed') ?? [];
  const processingCount = job?.documents.filter((d) => d.status === 'processing' || d.status === 'pending').length ?? 0;

  const openEdit = (doc: ExtractionDocument) => {
    const data = doc.extracted_data;
    if (!data) return;
    const matchedVendor = vendors.find((v) => v.name.toLowerCase() === data.vendor_name.toLowerCase());
    setEditDoc(doc);
    setEditForm({
      bill_number: data.bill_number,
      vendor_id: matchedVendor?.id || '',
      amount: parseFloat(data.amount) || 0,
      tax: data.tax ? parseFloat(data.tax) : 0,
      status: 'pending',
      description: data.description || '',
      due_date: data.due_date || '',
      items: data.items.map((i) => ({
        description: i.description,
        quantity: parseFloat(i.quantity) || 1,
        unit_price: parseFloat(i.unit_price) || 0,
      })),
    });
    setEditDialogOpen(true);
  };

  const addItem = () => setEditForm({ ...editForm, items: [...editForm.items, { description: '', quantity: 1, unit_price: 0 }] });

  const updateItem = (idx: number, field: keyof CreateLineItemRequest, value: string | number) => {
    const items = [...editForm.items];
    items[idx] = { ...items[idx], [field]: value };
    setEditForm({ ...editForm, items });
  };

  const removeItem = (idx: number) => setEditForm({ ...editForm, items: editForm.items.filter((_, i) => i !== idx) });

  const totalAmount = editForm.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const saveEdit = () => {
    if (!editDoc || !job) return;
    const vendorName = editForm.vendor_id
      ? vendors.find((v) => v.id === editForm.vendor_id)?.name || ''
      : (editDoc.extracted_data?.vendor_name || '');
    const updatedDocs = job.documents.map((d) =>
      d.id !== editDoc.id ? d : {
        ...d,
        extracted_data: {
          bill_number: editForm.bill_number,
          vendor_name: vendorName,
          amount: totalAmount.toString(),
          tax: editForm.tax ? editForm.tax.toString() : null,
          description: editForm.description || null,
          due_date: editForm.due_date || null,
          items: editForm.items.map((i) => ({
            description: i.description,
            quantity: i.quantity.toString(),
            unit_price: i.unit_price.toString(),
          })),
        } as ExtractedVendorBillData,
      }
    );
    setJob({ ...job, documents: updatedDocs });
    setEditDialogOpen(false);
    setEditDoc(null);
  };

  const handleConfirm = async () => {
    if (!job) return;
    setError(''); setStep('creating');
    let count = 0; let skipped = 0;
    for (const doc of completedDocs) {
      const data = doc.extracted_data;
      if (!data) { skipped++; continue; }
      let vendorId = vendors.find((v) => v.name.toLowerCase() === data.vendor_name.toLowerCase())?.id;
      if (!vendorId && data.vendor_name) {
        try { const nv = await createVendor({ name: data.vendor_name }); vendorId = nv.id; setVendors((p) => [...p, nv]); }
        catch { skipped++; continue; }
      }
      try {
        const items: CreateLineItemRequest[] = data.items.map((i) => ({
          description: i.description, quantity: parseFloat(i.quantity) || 1, unit_price: parseFloat(i.unit_price) || 0,
        }));
        await createVendorBill({
          bill_number: data.bill_number || null, vendor_id: vendorId || null,
          amount: items.reduce((s, i) => s + i.quantity * i.unit_price, 0),
          tax: data.tax ? parseFloat(data.tax) : null,
          description: data.description || null, due_date: data.due_date || null,
          status: 'pending', items: items.filter((i) => i.description),
        });
        count++;
      } catch { setError(`Failed to create bill from "${doc.filename}".`); }
    }
    setCreatedCount(count); setSkippedCount(skipped); setStep('done');
  };

  const reset = () => {
    setStep('upload'); setFiles([]); setJob(null); setError(''); setCreatedCount(0); setSkippedCount(0);
    pollingRef.current = false;
    listExtractions()
      .then((jobs) => setRecentJobs(jobs.slice(0, 5)))
      .catch(() => { });
  };

  const handleResume = (selected: ExtractionJob) => {
    pollingRef.current = false;
    setJob(selected);
    setError('');
    const allSettled = selected.documents.every(
      (d) => d.status === 'completed' || d.status === 'failed'
    );
    if (allSettled) {
      setStep('review');
    } else {
      setStep('extracting');
      pollJob(selected.id, selected.documents);
    }
  };

  const formatRelativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const jobSummary = (j: ExtractionJob) => {
    const total = j.documents.length;
    const completed = j.documents.filter((d) => d.status === 'completed').length;
    const failed = j.documents.filter((d) => d.status === 'failed').length;
    const processing = total - completed - failed;
    const parts: string[] = [];
    if (completed) parts.push(`${completed} completed`);
    if (processing) parts.push(`${processing} processing`);
    if (failed) parts.push(`${failed} failed`);
    return `${total} file${total !== 1 ? 's' : ''} · ${parts.join(', ')}`;
  };

  /* ─── Done ─── */
  if (step === 'done') {
    return (
      <Box textAlign="center" py={20}>
        <Flex justify="center" mb={5}>
          <Flex w="64px" h="64px" borderRadius="2xl" align="center" justify="center" bg="#0d2b12" border="1px solid #1a4a24">
            <Check size={28} color="#4ade80" />
          </Flex>
        </Flex>
        <Heading size="lg" color="gray.100" fontWeight="700" letterSpacing="-0.03em" mb={2}>Upload Complete</Heading>
        <Text color="gray.500" mb={2}>{createdCount} vendor bill(s) created.</Text>
        {skippedCount > 0 && <Text color="orange.400" fontSize="sm" mb={2}>{skippedCount} file(s) skipped.</Text>}
        {failedDocs.length > 0 && <Text color="red.400" fontSize="sm" mb={2}>{failedDocs.length} file(s) failed extraction.</Text>}
        <Flex justify="center" gap={3} mt={6}>
          <Button variant="outline" borderColor="#1e1e35" color="gray.400" _hover={{ bg: '#1a1a2e' }} borderRadius="lg" onClick={reset}>
            <Upload size={15} /> Upload More
          </Button>
          <Button bg="violet.600" color="white" _hover={{ bg: 'violet.700' }} borderRadius="lg" fontWeight="600" onClick={() => router.push('/vendor-bills')}>
            <ExternalLink size={15} /> View Vendor Bills
          </Button>
        </Flex>
      </Box>
    );
  }

  /* ─── Main ─── */
  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" color="gray.50" fontWeight="700" letterSpacing="-0.03em">Mass Upload</Heading>
          <Text fontSize="sm" color="gray.500" mt={0.5}>AI-powered batch extraction from PDFs & images</Text>
        </Box>
        {step !== 'upload' && step !== 'extracting' && (
          <Button variant="ghost" size="sm" color="gray.500" _hover={{ color: 'gray.300' }} borderRadius="lg" onClick={reset} gap={1.5}>
            <ArrowLeft size={14} /> Start Over
          </Button>
        )}
      </Flex>

      {error && (
        <Alert.Root status="error" mb={4} borderRadius="xl">
          <Alert.Indicator />
          <Alert.Title flex={1} fontSize="sm">{error}</Alert.Title>
          <Button size="xs" variant="ghost" onClick={() => setError('')}><X size={12} /></Button>
        </Alert.Root>
      )}

      {/* Step indicator */}
      <HStack gap={0} mb={8} border="1px solid" borderColor="#1a1a2e" borderRadius="xl" overflow="hidden">
        {STEPS.map(({ key, label }, idx) => {
          const stepIdx = STEPS.findIndex((s) => s.key === step);
          const isActive = stepIdx === idx;
          const isDone = stepIdx > idx;
          return (
            <Box
              key={key}
              flex={1}
              py={3}
              textAlign="center"
              fontWeight={isActive ? '600' : '400'}
              fontSize="sm"
              bg={isActive ? 'violet.950' : isDone ? '#0d2b12' : '#0c0c17'}
              color={isActive ? 'violet.300' : isDone ? 'green.400' : 'gray.600'}
              borderRight={idx < STEPS.length - 1 ? '1px solid' : undefined}
              borderColor="#1a1a2e"
            >
              {isDone && <Box as="span" mr={1}>✓</Box>}
              {label}
            </Box>
          );
        })}
      </HStack>

      {/* Upload step */}
      {step === 'upload' && (
        <Box border="1px solid" borderColor="#1a1a2e" borderRadius="2xl" overflow="hidden" bg="#0f0f1a">
          <Box
            border="2px dashed"
            borderColor={dragging ? 'violet.500' : '#1e1e35'}
            borderRadius="xl"
            m={4}
            py={14}
            px={8}
            textAlign="center"
            cursor="pointer"
            transition="all 0.15s"
            bg={dragging ? 'violet.950' : 'transparent'}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Flex justify="center" mb={4}>
              <Flex w="56px" h="56px" borderRadius="2xl" align="center" justify="center"
                bg={dragging ? 'violet.900' : '#13132a'}
                border="1px solid"
                borderColor={dragging ? 'violet.600' : '#1e1e35'}
              >
                <Upload size={22} color={dragging ? '#a78bfa' : '#4a4a6a'} />
              </Flex>
            </Flex>
            <Text fontWeight="600" fontSize="md" color={dragging ? 'violet.300' : 'gray.300'} mb={1}>
              {dragging ? 'Drop files here' : 'Drag & drop files here'}
            </Text>
            <Text fontSize="sm" color="gray.600">or click to browse · PDF, JPG, PNG</Text>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </Box>

          {files.length > 0 && (
            <Box px={4} pb={4}>
              <Flex justify="space-between" align="center" mb={3}>
                <Text fontSize="sm" fontWeight="600" color="gray.400">{files.length} file(s) selected</Text>
                <Button size="xs" variant="ghost" color="gray.600" _hover={{ color: 'gray.400' }} onClick={() => setFiles([])}>Clear all</Button>
              </Flex>
              <Stack gap={1.5} mb={4}>
                {files.map((f, idx) => (
                  <Flex key={idx} justify="space-between" align="center" bg="#0c0c17" border="1px solid" borderColor="#1a1a2e" px={3} py={2} borderRadius="lg">
                    <HStack gap={2.5}>
                      <FileText size={14} color="#7c3aed" />
                      <Text fontSize="sm" fontWeight="500" color="gray.200">{f.name}</Text>
                      <Text fontSize="xs" color="gray.600">({(f.size / 1024).toFixed(1)} KB)</Text>
                    </HStack>
                    <Button size="xs" variant="ghost" color="gray.600" _hover={{ color: 'red.400' }} onClick={() => removeFile(idx)}>
                      <X size={13} />
                    </Button>
                  </Flex>
                ))}
              </Stack>
              <Button
                w="full"
                bg="violet.600"
                color="white"
                _hover={{ bg: 'violet.700' }}
                borderRadius="lg"
                fontWeight="600"
                onClick={handleUpload}
                gap={2}
              >
                <Zap size={15} fill="currentColor" /> Extract {files.length} file(s) with AI
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Previous sessions */}
      {step === 'upload' && !loadingRecent && recentJobs.length > 0 && (
        <Box mt={5} border="1px solid" borderColor="#1a1a2e" borderRadius="2xl" overflow="hidden">
          <Flex align="center" gap={2} px={4} py={3} borderBottom="1px solid" borderColor="#1a1a2e" bg="#0c0c17">
            <Clock size={13} color="#4a4a6a" />
            <Text fontSize="xs" color="gray.600" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">
              Previous Sessions
            </Text>
          </Flex>
          <Stack gap={0}>
            {recentJobs.map((j, idx) => {
              const allSettled = j.documents.every((d) => d.status === 'completed' || d.status === 'failed');
              const hasProcessing = j.documents.some((d) => d.status === 'processing' || d.status === 'pending');
              return (
                <Flex
                  key={j.id}
                  justify="space-between"
                  align="center"
                  px={4}
                  py={3}
                  borderBottom={idx < recentJobs.length - 1 ? '1px solid' : undefined}
                  borderColor="#1a1a2e"
                  _hover={{ bg: '#0c0c17' }}
                  transition="background 0.1s"
                >
                  <Box>
                    <HStack gap={2} mb={0.5}>
                      <Text fontSize="sm" color="gray.200" fontWeight="500">{jobSummary(j)}</Text>
                      {hasProcessing && (
                        <Tag.Root colorPalette="blue" size="sm">
                          <Tag.Label>In progress</Tag.Label>
                        </Tag.Root>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="gray.600">{formatRelativeTime(j.created_at)}</Text>
                  </Box>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="#1e1e35"
                    color="gray.400"
                    _hover={{ bg: '#1a1a2e', color: 'violet.300', borderColor: 'violet.800' }}
                    borderRadius="lg"
                    onClick={() => handleResume(j)}
                    gap={1.5}
                  >
                    <RotateCcw size={12} />
                    {allSettled ? 'Review' : 'Resume'}
                  </Button>
                </Flex>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Extracting step */}
      {step === 'extracting' && job && (
        <Box textAlign="center" py={12}>
          <Spinner size="xl" color="violet.400" mb={5} />
          <Heading size="md" color="gray.100" fontWeight="700" letterSpacing="-0.02em" mb={1}>Extracting data…</Heading>
          <Text color="gray.500" mb={1} fontSize="sm">Processing {job.documents.length} file(s) with AI</Text>
          {processingCount < job.documents.length && (
            <Text fontSize="xs" color="violet.400" mb={6}>
              {job.documents.length - processingCount}/{job.documents.length} completed
            </Text>
          )}
          <Stack gap={1.5} maxW="440px" mx="auto" mt={6}>
            {job.documents.map((d) => (
              <Flex key={d.id} justify="space-between" align="center" bg="#0f0f1a" border="1px solid" borderColor="#1a1a2e" px={4} py={2.5} borderRadius="lg">
                <HStack gap={2}>
                  <FileText size={13} color="#7c3aed" />
                  <Text fontSize="sm" color="gray.300">{d.filename}</Text>
                </HStack>
                <Tag.Root colorPalette={statusColors[d.status] || 'gray'} size="sm">
                  <Tag.Label>{d.status}</Tag.Label>
                </Tag.Root>
              </Flex>
            ))}
          </Stack>
          <Flex justify="center" gap={3} mt={8}>
            {failedDocs.length > 0 && (
              <Button variant="outline" borderColor="#1e1e35" color="gray.400" _hover={{ bg: '#1a1a2e' }} borderRadius="lg" onClick={handleRetry} gap={1.5}>
                <Upload size={14} /> Retry Failed
              </Button>
            )}
            <Button variant="outline" borderColor="#1e1e35" color="red.400" _hover={{ bg: '#1a1a2e' }} borderRadius="lg" onClick={handleAbort} loading={aborting} loadingText="Aborting…" gap={1.5}>
              <X size={14} /> Abort
            </Button>
          </Flex>
        </Box>
      )}

      {/* Review step */}
      {step === 'review' && job && (
        <Box>
          {failedDocs.length > 0 && (
            <Alert.Root status="warning" mb={4} borderRadius="xl">
              <Alert.Indicator />
              <Alert.Title flex={1} fontSize="sm">{failedDocs.length} file(s) failed and will be skipped.</Alert.Title>
              <Button size="sm" variant="outline" borderColor="#1e1e35" color="gray.400" _hover={{ bg: '#1a1a2e' }} borderRadius="lg" onClick={handleRetry} gap={1}>
                <Upload size={13} /> Retry
              </Button>
            </Alert.Root>
          )}

          {completedDocs.length === 0 ? (
            <Box textAlign="center" py={20}>
              <Flex justify="center" mb={4}>
                <AlertTriangle size={40} color="#f97316" />
              </Flex>
              <Heading size="md" color="gray.200" fontWeight="700" mb={2}>No documents extracted</Heading>
              <Text color="gray.500" fontSize="sm" mb={6}>All files failed extraction. Try retrying or start over.</Text>
              <Flex justify="center" gap={3}>
                {failedDocs.length > 0 && (
                  <Button bg="violet.600" color="white" _hover={{ bg: 'violet.700' }} borderRadius="lg" onClick={handleRetry} gap={1.5}>
                    <Upload size={14} /> Retry Failed
                  </Button>
                )}
                <Button variant="outline" borderColor="#1e1e35" color="gray.400" _hover={{ bg: '#1a1a2e' }} borderRadius="lg" onClick={reset}>Start Over</Button>
              </Flex>
            </Box>
          ) : (
            <Box>
              <Flex justify="space-between" align="center" mb={4}>
                <Text color="gray.500" fontSize="sm">{completedDocs.length} file(s) ready — review before confirming</Text>
              </Flex>
              <Stack gap={3}>
                {completedDocs.map((doc) => {
                  const data = doc.extracted_data;
                  if (!data) return null;
                  const matchedVendor = vendors.find((v) => v.name.toLowerCase() === data.vendor_name.toLowerCase());
                  const itemTotal = data.items.reduce((s, i) => s + (parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0), 0);
                  const isNewVendor = !matchedVendor && !!data.vendor_name;
                  return (
                    <Box key={doc.id} bg="#0f0f1a" border="1px solid" borderColor="#1a1a2e" borderRadius="2xl" p={5}>
                      <Flex justify="space-between" align="flex-start" mb={4}>
                        <HStack gap={3}>
                          <Flex w="36px" h="36px" borderRadius="lg" align="center" justify="center" bg="#13132a" flexShrink={0}>
                            <FileText size={16} color="#7c3aed" />
                          </Flex>
                          <Box>
                            <Text fontWeight="600" color="gray.100" fontSize="sm">{doc.filename}</Text>
                            <Text fontSize="xs" color="gray.500">{data.bill_number ? `Bill #${data.bill_number}` : 'No bill number'}</Text>
                          </Box>
                        </HStack>
                        <Button size="sm" variant="outline" borderColor="#1e1e35" color="gray.400" _hover={{ bg: '#1a1a2e', color: 'gray.200' }} borderRadius="lg" onClick={() => openEdit(doc)} gap={1.5}>
                          <Pencil size={12} /> Edit
                        </Button>
                      </Flex>

                      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3} fontSize="sm" mb={data.items.length > 0 ? 4 : 0}>
                        <Box>
                          <Text color="gray.600" fontSize="xs" mb={1}>Vendor</Text>
                          <HStack gap={2} flexWrap="wrap">
                            <Text fontWeight="500" color="gray.200">{data.vendor_name || '—'}</Text>
                            {isNewVendor && <Badge colorPalette="orange" size="sm" borderRadius="full">New</Badge>}
                          </HStack>
                          {isNewVendor && <Text fontSize="xs" color="orange.500" mt={0.5}>Will be created on confirm</Text>}
                        </Box>
                        <Box>
                          <Text color="gray.600" fontSize="xs" mb={1}>Amount</Text>
                          <Text fontWeight="600" color="gray.100">${itemTotal.toFixed(2)}</Text>
                        </Box>
                        {data.tax && (
                          <Box>
                            <Text color="gray.600" fontSize="xs" mb={1}>Tax</Text>
                            <Text fontWeight="500" color="gray.200">${parseFloat(data.tax).toFixed(2)}</Text>
                          </Box>
                        )}
                        {data.due_date && (
                          <Box>
                            <Text color="gray.600" fontSize="xs" mb={1}>Due Date</Text>
                            <Text fontWeight="500" color="gray.200">{data.due_date}</Text>
                          </Box>
                        )}
                        {data.description && (
                          <Box gridColumn="span 2">
                            <Text color="gray.600" fontSize="xs" mb={1}>Description</Text>
                            <Text fontWeight="500" color="gray.300">{data.description}</Text>
                          </Box>
                        )}
                      </Box>

                      {data.items.length > 0 && (
                        <Box overflowX="auto" borderRadius="lg" border="1px solid" borderColor="#1a1a2e">
                          <Table.Root size="sm">
                            <Table.Header>
                              <Table.Row bg="#0c0c17">
                                <Table.ColumnHeader color="gray.600" fontSize="xs">Description</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontSize="xs" textAlign="right" w="72px">Qty</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontSize="xs" textAlign="right" w="100px">Unit Price</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontSize="xs" textAlign="right" w="100px">Amount</Table.ColumnHeader>
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {data.items.map((item, idx) => (
                                <Table.Row key={idx}>
                                  <Table.Cell color="gray.300" fontSize="xs">{item.description}</Table.Cell>
                                  <Table.Cell textAlign="right" color="gray.400" fontSize="xs">{item.quantity}</Table.Cell>
                                  <Table.Cell textAlign="right" color="gray.400" fontSize="xs">${parseFloat(item.unit_price).toFixed(2)}</Table.Cell>
                                  <Table.Cell textAlign="right" color="gray.200" fontSize="xs" fontWeight="500">
                                    ${((parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                                  </Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table.Root>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Stack>

              {completedDocs.some((d) => !vendors.find((v) => v.name.toLowerCase() === (d.extracted_data?.vendor_name || '').toLowerCase()) && d.extracted_data?.vendor_name) && (
                <Alert.Root status="info" mt={4} borderRadius="xl">
                  <Alert.Indicator />
                  <Alert.Title fontSize="sm">Vendors tagged "New" will be automatically created.</Alert.Title>
                </Alert.Root>
              )}

              <Button
                mt={5}
                w="full"
                size="lg"
                bg="violet.600"
                color="white"
                _hover={{ bg: 'violet.700' }}
                borderRadius="xl"
                fontWeight="600"
                gap={2}
                onClick={handleConfirm}
              >
                <Send size={16} /> Confirm & Create {completedDocs.length} Vendor Bill(s)
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Creating step */}
      {step === 'creating' && (
        <Box textAlign="center" py={20}>
          <Spinner size="xl" color="violet.400" mb={5} />
          <Heading size="md" color="gray.100" fontWeight="700" mb={1}>Creating vendor bills…</Heading>
          <Text color="gray.500" fontSize="sm">Please wait, this may take a moment.</Text>
        </Box>
      )}

      {/* Edit dialog */}
      <Dialog.Root open={editDialogOpen} onOpenChange={(e) => setEditDialogOpen(e.open)} size="lg">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="#13131f" border="1px solid #1e1e35" borderRadius="2xl">
            <Dialog.Header borderBottom="1px solid #1e1e35" pb={4}>
              <Box>
                <Text fontWeight="700" fontSize="md" color="gray.100" letterSpacing="-0.02em">Edit Extracted Bill</Text>
                {editDoc && <Text fontSize="xs" color="gray.500" mt={0.5}>{editDoc.filename}</Text>}
              </Box>
              <Button size="sm" variant="ghost" color="gray.600" _hover={{ color: 'gray.300' }} ml="auto" onClick={() => setEditDialogOpen(false)}>
                <X size={16} />
              </Button>
            </Dialog.Header>
            <Dialog.Body py={5}>
              <Stack gap={4}>
                <Field.Root>
                  <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Bill Number <Text as="span" color="gray.600" textTransform="none" fontWeight="400">(optional)</Text></Field.Label>
                  <Input {...fieldStyle} value={editForm.bill_number || ''} onChange={(e) => setEditForm({ ...editForm, bill_number: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Vendor</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field {...fieldStyle} value={editForm.vendor_id || ''} onChange={(e) => setEditForm({ ...editForm, vendor_id: e.target.value })}>
                      <option value="">No vendor / auto-create from extracted name</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Status</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field {...fieldStyle} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Flex gap={3}>
                  <Field.Root flex={1}>
                    <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Due Date</Field.Label>
                    <Input {...fieldStyle} type="date" value={editForm.due_date || ''} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                  </Field.Root>
                  <Field.Root w="140px">
                    <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Tax ($)</Field.Label>
                    <Input {...fieldStyle} type="number" value={editForm.tax || 0} onChange={(e) => setEditForm({ ...editForm, tax: parseFloat(e.target.value) || 0 })} />
                  </Field.Root>
                </Flex>
                <Field.Root>
                  <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Description</Field.Label>
                  <Input {...fieldStyle} value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Optional note" />
                </Field.Root>

                <Box>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Text fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Line Items</Text>
                    <Button size="xs" variant="outline" borderColor="#1e1e35" color="gray.400" _hover={{ bg: '#1a1a2e', color: 'gray.200' }} borderRadius="lg" onClick={addItem} gap={1}>
                      <Plus size={12} /> Add
                    </Button>
                  </Flex>
                  {editForm.items.length === 0 && (
                    <Box py={4} textAlign="center" border="1px dashed" borderColor="#1e1e35" borderRadius="lg">
                      <Text fontSize="xs" color="gray.700">No line items. Click "Add" to start.</Text>
                    </Box>
                  )}
                  <Stack gap={2}>
                    {editForm.items.map((item, idx) => (
                      <Flex key={idx} gap={2} align="flex-end">
                        <Box flex={2}>
                          <Field.Root required>
                            <Field.Label fontSize="xs" color="gray.600">Description</Field.Label>
                            <Input size="sm" {...fieldStyle} value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                          </Field.Root>
                        </Box>
                        <Box w="80px">
                          <Field.Root required>
                            <Field.Label fontSize="xs" color="gray.600">Qty</Field.Label>
                            <Input size="sm" {...fieldStyle} type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                          </Field.Root>
                        </Box>
                        <Box w="110px">
                          <Field.Root required>
                            <Field.Label fontSize="xs" color="gray.600">Unit Price</Field.Label>
                            <Input size="sm" {...fieldStyle} type="number" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
                          </Field.Root>
                        </Box>
                        <Box pb={1}>
                          <Button size="sm" variant="ghost" color="gray.700" _hover={{ color: 'red.400' }} onClick={() => removeItem(idx)}>
                            <X size={14} />
                          </Button>
                        </Box>
                      </Flex>
                    ))}
                  </Stack>
                  {editForm.items.length > 0 && (
                    <Flex justify="flex-end" mt={3} pt={3} borderTop="1px solid" borderColor="#1e1e35">
                      <Text fontSize="sm" fontWeight="700" color="gray.200">Total: ${totalAmount.toFixed(2)}</Text>
                    </Flex>
                  )}
                </Box>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid #1e1e35" pt={4} gap={2}>
              <Button variant="ghost" color="gray.500" _hover={{ color: 'gray.300', bg: '#1a1a2e' }} borderRadius="lg" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={saveEdit}
                bg="violet.600"
                color="white"
                _hover={{ bg: 'violet.700' }}
                borderRadius="lg"
                fontWeight="600"
              >
                Save Changes
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
