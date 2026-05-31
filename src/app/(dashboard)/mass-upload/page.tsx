'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Input, Stack, Heading, Table, Dialog, Field, Alert, Flex, NativeSelect, Text, Card, HStack, Tag, Spinner,
} from '@chakra-ui/react';
import { Upload, FileText, Check, X, AlertTriangle, Pencil, ArrowLeft, Send } from 'lucide-react';
import { uploadForExtraction, getExtractionDocument, retryExtraction, abortExtraction, type ExtractionJob, type ExtractionDocument, type ExtractedVendorBillData } from '@/services/extractions';
import { createVendorBill, type CreateVendorBillRequest, type CreateLineItemRequest } from '@/services/vendorBills';
import { listVendors, createVendor, type Vendor, type CreateVendorRequest } from '@/services/vendors';

type Step = 'upload' | 'extracting' | 'review' | 'creating' | 'done';

const statusColors: Record<string, string> = { pending: 'gray', processing: 'blue', completed: 'green', failed: 'red' };

export default function MassUploadVendorBillPage() {
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
  const pollingRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listVendors().then(setVendors).catch(() => { });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const removeFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setError('');
    setStep('extracting');
    try {
      const result = await uploadForExtraction(files);
      setJob(result);
      pollJob(result.id, result.documents);
    } catch {
      setError('Failed to upload files for extraction');
      setStep('upload');
    }
  };

  const handleAbort = async () => {
    if (!job) return;
    setAborting(true);
    pollingRef.current = false;
    try {
      const updated = await abortExtraction(job.id);
      setJob(updated);
    } catch {
      setError('Failed to abort extraction.');
    }
    setAborting(false);
    setStep('review');
  };

  const handleRetry = async () => {
    if (!job) return;
    try {
      pollingRef.current = false;
      await new Promise((r) => setTimeout(r, 500));
      const updated = await retryExtraction(job.id);
      setJob(updated);
      pollingRef.current = true;
      pollJob(job.id, updated.documents);
    } catch {
      setError('Failed to retry extraction.');
    }
  };

  const pollJob = async (jobId: string, docs: ExtractionDocument[]) => {
    pollingRef.current = true;
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      if (!pollingRef.current) return;
      await new Promise((r) => setTimeout(r, 2000));
      if (!pollingRef.current) return;
      try {
        const updatedDocs = await Promise.all(
          docs.map((d) => getExtractionDocument(d.id))
        );
        setJob((prev) => prev ? { ...prev, documents: updatedDocs } : null);
        const allDone = updatedDocs.every((d) => d.status === 'completed' || d.status === 'failed');
        if (allDone) {
          setStep('review');
          return;
        }
      } catch {
        // continue polling
      }
    }
    setError('Extraction timed out. Please check extraction jobs later.');
    setStep('review');
  };

  const docsByStatus = (status: string) => job?.documents.filter((d) => d.status === status) || [];
  const completedDocs = docsByStatus('completed');
  const failedDocs = docsByStatus('failed');

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

  const addItem = () => {
    setEditForm({ ...editForm, items: [...editForm.items, { description: '', quantity: 1, unit_price: 0 }] });
  };

  const updateItem = (idx: number, field: keyof CreateLineItemRequest, value: string | number) => {
    const items = [...editForm.items];
    items[idx] = { ...items[idx], [field]: value };
    setEditForm({ ...editForm, items });
  };

  const removeItem = (idx: number) => {
    setEditForm({ ...editForm, items: editForm.items.filter((_, i) => i !== idx) });
  };

  const totalAmount = editForm.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const saveEdit = () => {
    if (!editDoc || !job) return;
    const originalData = editDoc.extracted_data;
    const vendorName = editForm.vendor_id
      ? vendors.find((v) => v.id === editForm.vendor_id)?.name || ''
      : (originalData?.vendor_name || '');
    const updatedDocs = job.documents.map((d) => {
      if (d.id !== editDoc.id) return d;
      return {
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
      };
    });
    setJob({ ...job, documents: updatedDocs });
    setEditDialogOpen(false);
    setEditDoc(null);
  };

  const handleConfirm = async () => {
    if (!job) return;
    setError('');
    setStep('creating');
    let count = 0;
    let skipped = 0;
    for (const doc of completedDocs) {
      const data = doc.extracted_data;
      if (!data || !data.bill_number) { skipped++; continue; }
      let vendorId = vendors.find((v) => v.name.toLowerCase() === data.vendor_name.toLowerCase())?.id || editForm.vendor_id || undefined;
      if (!vendorId && data.vendor_name) {
        try {
          const newVendor = await createVendor({ name: data.vendor_name });
          vendorId = newVendor.id;
          setVendors((prev) => [...prev, newVendor]);
        } catch {
          skipped++;
          continue;
        }
      }
      try {
        const items: CreateLineItemRequest[] = data.items.map((i) => ({
          description: i.description,
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
        }));
        const payload: CreateVendorBillRequest = {
          bill_number: data.bill_number,
          vendor_id: vendorId || null,
          amount: items.reduce((s, i) => s + i.quantity * i.unit_price, 0),
          tax: data.tax ? parseFloat(data.tax) : null,
          description: data.description || null,
          due_date: data.due_date || null,
          status: 'pending',
          items: items.filter((i) => i.description),
        };
        await createVendorBill(payload);
        count++;
      } catch {
        setError(`Failed to create vendor bill from "${doc.filename}". You may create it manually.`);
      }
    }
    setCreatedCount(count);
    setSkippedCount(skipped);
    setStep('done');
  };

  const reset = () => {
    setStep('upload');
    setFiles([]);
    setJob(null);
    setError('');
    setCreatedCount(0);
    setSkippedCount(0);
  };

  if (step === 'done') {
    return (
      <Box textAlign="center" py={16}>
        <Box mb={4} color="green.400"><Check size={48} style={{ margin: '0 auto' }} /></Box>
        <Heading size="lg" mb={2}>Upload Complete</Heading>
        <Text color="gray.400" mb={6}>{createdCount} vendor bill(s) created successfully.</Text>
        {skippedCount > 0 && (
          <Text color="orange.400" mb={6}>{skippedCount} file(s) skipped (missing bill number or vendor creation failed). You can create them manually.</Text>
        )}
        {failedDocs.length > 0 && (
          <Text color="orange.400" mb={6}>{failedDocs.length} file(s) failed extraction.</Text>
        )}
        <Button onClick={reset}><Upload size={16} /> Upload More</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg" color={"gray.100"}>Mass Upload Vendor Bills</Heading>
        {step !== 'upload' && step !== 'extracting' && (
          <Button variant="ghost" onClick={reset}><ArrowLeft size={16} /> Start Over</Button>
        )}
      </Flex>

      {error && <Alert.Root status="error" mb={4}><Alert.Indicator /><Alert.Title>{error}</Alert.Title></Alert.Root>}

      <HStack gap={0} mb={6} bg="gray.800" borderRadius="md" boxShadow="sm" overflow="hidden">
        {['Upload Files', 'Extract Data', 'Review & Edit', 'Confirm'].map((label, idx) => {
          const stepNames: Step[] = ['upload', 'extracting', 'review', 'creating'];
          const stepIdx = stepNames.indexOf(step);
          const isActive = stepIdx === idx;
          const isDone = stepIdx > idx;
          return (
            <Box key={label} flex={1} py={3} textAlign="center" fontWeight="medium" fontSize="sm"
              bg={isActive ? 'blue.600' : isDone ? 'green.500' : 'gray.100'}
              color={isActive || isDone ? 'white' : 'gray.400'}>
              {isDone ? '✓ ' : isActive ? '→ ' : ''}{label}
            </Box>
          );
        })}
      </HStack>

      {step === 'upload' && (
        <Card.Root>
          <Card.Body>
            <Flex direction="column" align="center" py={8} gap={4}>
              <Box color="gray.400"><Upload size={48} /></Box>
              <Text fontWeight="medium">Select PDF or image files to extract vendor bill data</Text>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              <Button onClick={() => fileInputRef.current?.click()}><Upload size={16} /> Choose Files</Button>
              {files.length > 0 && (
                <Box w="full" maxW="md">
                  <Text fontWeight="bold" mb={2}>{files.length} file(s) selected:</Text>
                  <Stack gap={2}>
                    {files.map((f, idx) => (
                      <Flex key={idx} justify="space-between" align="center" bg="gray.800" p={2} borderRadius="md">
                        <HStack><FileText size={16} /><Text fontSize="sm">{f.name} ({(f.size / 1024).toFixed(1)} KB)</Text></HStack>
                        <Button size="xs" variant="ghost" onClick={() => removeFile(idx)}><X size={14} /></Button>
                      </Flex>
                    ))}
                  </Stack>
                  <Button mt={4} colorScheme="blue" w="full" onClick={handleUpload}>
                    <Upload size={16} /> Upload & Extract ({files.length} files)
                  </Button>
                </Box>
              )}
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      {step === 'extracting' && job && (
        <Box textAlign="center" py={12}>
          <Spinner size="xl" mb={4} />
          <Heading size="md" mb={2}>Extracting vendor bill data...</Heading>
          <Text color="gray.400" mb={4}>Processing {job.documents.length} file(s) with AI</Text>
          <Stack gap={2} maxW="md" mx="auto">
            {job.documents.map((d) => (
              <Flex key={d.id} justify="space-between" align="center" bg="gray.800" p={3} borderRadius="md" boxShadow="sm">
                <HStack><FileText size={14} /><Text fontSize="sm">{d.filename}</Text></HStack>
                <Tag.Root colorPalette={statusColors[d.status] || 'gray'}>
                  <Tag.Label>{d.status}</Tag.Label>
                </Tag.Root>
              </Flex>
            ))}
          </Stack>
          {job.documents.some((d) => d.status === 'failed') && (
            <Flex justify="center" gap={3} mt={6}>
              <Button variant="outline" colorScheme="red" onClick={handleAbort} disabled={aborting}>
                <X size={16} /> Abort
              </Button>
              <Button colorScheme="blue" onClick={handleRetry}>
                <Upload size={16} /> Retry Failed
              </Button>
            </Flex>
          )}
          {!job.documents.some((d) => d.status === 'failed') && (
            <Flex justify="center" gap={3} mt={6}>
              <Button variant="outline" colorScheme="red" onClick={handleAbort} disabled={aborting}>
                <X size={16} /> Abort
              </Button>
            </Flex>
          )}
        </Box>
      )}

      {step === 'review' && job && (
        <Box>
          {failedDocs.length > 0 && (
            <Alert.Root status="warning" mb={4}>
              <Alert.Indicator />
              <Alert.Title>{failedDocs.length} file(s) failed extraction.</Alert.Title>
              <Button size="sm" ml={4} onClick={handleRetry}><Upload size={14} /> Retry Failed</Button>
            </Alert.Root>
          )}
          {completedDocs.length === 0 ? (
            <Box textAlign="center" py={12}>
              <AlertTriangle size={48} style={{ margin: '0 auto', color: '#e53e3e' }} />
              <Heading size="md" mt={4}>No documents were successfully extracted</Heading>
              <Flex justify="center" gap={3} mt={4}>
                {failedDocs.length > 0 && <Button onClick={handleRetry}><Upload size={16} /> Retry Failed</Button>}
                <Button variant="outline" onClick={reset}><Upload size={16} /> Start Over</Button>
              </Flex>
            </Box>
          ) : (
            <Box>
              <Text mb={4} color="gray.400">{completedDocs.length} file(s) extracted. Review and edit the data before confirming.</Text>
              <Stack gap={4}>
                {completedDocs.map((doc) => {
                  const data = doc.extracted_data;
                  if (!data) return null;
                  const matchedVendor = vendors.find((v) => v.name.toLowerCase() === data.vendor_name.toLowerCase());
                  const itemTotal = data.items.reduce((s, i) => s + (parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0), 0);
                  return (
                    <Card.Root key={doc.id}>
                      <Card.Body>
                        <Flex justify="space-between" align="flex-start" mb={3}>
                          <Box>
                            <Flex align="center" gap={2} mb={1}>
                              <FileText size={14} />
                              <Text fontWeight="bold">{doc.filename}</Text>
                            </Flex>
                            <Text fontSize="sm" color="gray.400">Bill #: {data.bill_number}</Text>
                          </Box>
                          <Button size="sm" variant="outline" onClick={() => openEdit(doc)}><Pencil size={14} /> Edit</Button>
                        </Flex>
                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} fontSize="sm" mb={3}>
                          <Box><Text color="gray.400">Vendor</Text><Text fontWeight="medium">{matchedVendor?.name || data.vendor_name}{matchedVendor ? '' : ' (not found)'}</Text></Box>
                          <Box><Text color="gray.400">Amount</Text><Text fontWeight="medium">${itemTotal.toFixed(2)}</Text></Box>
                          {data.tax && <Box><Text color="gray.400">Tax</Text><Text fontWeight="medium">{data.tax}</Text></Box>}
                          {data.due_date && <Box><Text color="gray.400">Due Date</Text><Text fontWeight="medium">{data.due_date}</Text></Box>}
                          {data.description && <Box gridColumn="span 2"><Text color="gray.400">Description</Text><Text fontWeight="medium">{data.description}</Text></Box>}
                        </Box>
                        {data.items.length > 0 && (
                          <Box overflowX="auto">
                            <Text fontWeight="bold" fontSize="sm" mb={1}>Line Items</Text>
                            <Table.Root size="sm" variant="outline">
                              <Table.Header>
                                <Table.Row>
                                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                                  <Table.ColumnHeader w="80px">Qty</Table.ColumnHeader>
                                  <Table.ColumnHeader w="100px">Unit Price</Table.ColumnHeader>
                                  <Table.ColumnHeader w="100px">Amount</Table.ColumnHeader>
                                </Table.Row>
                              </Table.Header>
                              <Table.Body>
                                {data.items.map((item, idx) => (
                                  <Table.Row key={idx}>
                                    <Table.Cell>{item.description}</Table.Cell>
                                    <Table.Cell>{item.quantity}</Table.Cell>
                                    <Table.Cell>${parseFloat(item.unit_price).toFixed(2)}</Table.Cell>
                                    <Table.Cell>${((parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0)).toFixed(2)}</Table.Cell>
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table.Root>
                          </Box>
                        )}
                      </Card.Body>
                    </Card.Root>
                  );
                })}
              </Stack>
              <Button mt={6} colorScheme="blue" size="lg" w="full" onClick={handleConfirm}>
                <Send size={16} /> Confirm & Create {completedDocs.length} Vendor Bill(s)
              </Button>
            </Box>
          )}
        </Box>
      )}

      {step === 'creating' && (
        <Box textAlign="center" py={12}>
          <Spinner size="xl" mb={4} />
          <Heading size="md">Creating vendor bills...</Heading>
        </Box>
      )}

      <Dialog.Root open={editDialogOpen} onOpenChange={(e) => setEditDialogOpen(e.open)} size="lg">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>Edit Extracted Bill</Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Field.Root required>
                  <Field.Label>Bill Number</Field.Label>
                  <Input value={editForm.bill_number} onChange={(e) => setEditForm({ ...editForm, bill_number: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Vendor</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={editForm.vendor_id || ''} onChange={(e) => setEditForm({ ...editForm, vendor_id: e.target.value })}>
                      <option value="">No vendor</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Status</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Description</Field.Label>
                  <Input value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Due Date</Field.Label>
                  <Input type="date" value={editForm.due_date || ''} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Tax</Field.Label>
                  <Input type="number" value={editForm.tax || 0} onChange={(e) => setEditForm({ ...editForm, tax: parseFloat(e.target.value) || 0 })} />
                </Field.Root>
                <Box>
                  <Flex justify="space-between" align="center" mb={2}>
                    <Heading size="sm">Line Items</Heading>
                    <Button size="sm" variant="outline" onClick={addItem}><Pencil size={14} /> Add Item</Button>
                  </Flex>
                  {editForm.items.map((item, idx) => (
                    <Flex key={idx} gap={2} mb={2} align="flex-end">
                      <Box flex={2}>
                        <Field.Root required>
                          <Field.Label>Description</Field.Label>
                          <Input size="sm" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                        </Field.Root>
                      </Box>
                      <Box w="100px">
                        <Field.Root required>
                          <Field.Label>Qty</Field.Label>
                          <Input size="sm" type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                        </Field.Root>
                      </Box>
                      <Box w="120px">
                        <Field.Root required>
                          <Field.Label>Unit Price</Field.Label>
                          <Input size="sm" type="number" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
                        </Field.Root>
                      </Box>
                      <Box pt={5}>
                        <Button size="sm" variant="ghost" colorScheme="red" onClick={() => removeItem(idx)}><X size={14} /></Button>
                      </Box>
                    </Flex>
                  ))}
                  <Text fontWeight="bold" textAlign="right" mt={2}>Total: ${totalAmount.toFixed(2)}</Text>
                </Box>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={!editForm.bill_number}>Save</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
