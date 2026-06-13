'use client';
import { useEffect, useState } from 'react';
import {
  Box, Button, Input, Stack, Heading, Table, Dialog, Field, Alert, Flex, Badge, NativeSelect, Text,
} from '@chakra-ui/react';
import { Plus, Pencil, Trash2, Receipt, X, Loader2 } from 'lucide-react';
import { listVendorBills, getVendorBill, createVendorBill, updateVendorBill, deleteVendorBill, type VendorBill, type CreateVendorBillRequest, type CreateLineItemRequest } from '@/services/vendorBills';
import { listVendors, type Vendor } from '@/services/vendors';

const statusColors: Record<string, string> = { pending: 'gray', approved: 'green', paid: 'blue', overdue: 'red', cancelled: 'orange' };

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

export default function VendorBillsPage() {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VendorBill | null>(null);
  const [form, setForm] = useState<CreateVendorBillRequest & { items: CreateLineItemRequest[] }>({
    bill_number: '', vendor_id: '', amount: 0, tax: 0, status: 'pending', description: '', due_date: '', items: [],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [billList, venList] = await Promise.all([listVendorBills(), listVendors()]);
      setBills(billList);
      setVendors(venList);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ bill_number: '', vendor_id: '', amount: 0, tax: 0, status: 'pending', description: '', due_date: '', items: [] });
    setDialogOpen(true);
  };

  const openEdit = async (b: VendorBill) => {
    setLoadingEdit(b.id);
    try {
      const full = await getVendorBill(b.id);
      setEditing(full);
      setForm({
        bill_number: full.bill_number,
        vendor_id: full.vendor_id || '',
        amount: full.amount,
        tax: full.tax || 0,
        status: full.status,
        description: full.description || '',
        due_date: full.due_date || '',
        items: full.items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
      });
      setDialogOpen(true);
    } catch {
      setError('Failed to load vendor bill details');
    } finally {
      setLoadingEdit(null);
    }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit_price: 0 }] });

  const updateItem = (idx: number, field: keyof CreateLineItemRequest, value: string | number) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const totalAmount = form.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        vendor_id: form.vendor_id || null,
        tax: form.tax || null,
        description: form.description || null,
        due_date: form.due_date || null,
        amount: totalAmount,
        items: form.items.filter((i) => i.description),
      };
      if (editing) await updateVendorBill(editing.id, payload);
      else await createVendorBill(payload);
      setDialogOpen(false);
      await load();
    } catch { setError('Failed to save vendor bill'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this vendor bill?')) return;
    try { await deleteVendorBill(id); await load(); }
    catch { setError('Failed to delete vendor bill'); }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" color="gray.50" fontWeight="700" letterSpacing="-0.03em">Vendor Bills</Heading>
          <Text fontSize="sm" color="gray.500" mt={0.5}>Track and manage incoming vendor bills</Text>
        </Box>
        <Button
          onClick={openCreate}
          bg="violet.600"
          color="white"
          _hover={{ bg: 'violet.700' }}
          size="sm"
          borderRadius="lg"
          fontWeight="600"
          gap={1.5}
        >
          <Plus size={15} /> New Bill
        </Button>
      </Flex>

      {error && (
        <Alert.Root status="error" mb={4} borderRadius="xl">
          <Alert.Indicator />
          <Alert.Title flex={1}>{error}</Alert.Title>
          <Button size="xs" variant="ghost" onClick={() => setError('')}><X size={12} /></Button>
        </Alert.Root>
      )}

      <Box border="1px solid" borderColor="#1a1a2e" borderRadius="xl" overflow="hidden">
        <Box overflowX="auto">
        <Table.Root variant="outline">
          <Table.Header>
            <Table.Row bg="#0f0f1a">
              <Table.ColumnHeader color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Bill #</Table.ColumnHeader>
              <Table.ColumnHeader color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Vendor</Table.ColumnHeader>
              <Table.ColumnHeader color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Amount</Table.ColumnHeader>
              <Table.ColumnHeader color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Status</Table.ColumnHeader>
              <Table.ColumnHeader color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Due Date</Table.ColumnHeader>
              <Table.ColumnHeader w="100px" color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {bills.length > 0 ? bills.map((b) => (
              <Table.Row key={b.id} _hover={{ bg: '#0f0f1a' }} transition="background 0.1s">
                <Table.Cell fontWeight="600" color="gray.100" fontSize="sm">{b.bill_number}</Table.Cell>
                <Table.Cell color="gray.400" fontSize="sm">{b.vendor_id ? vendors.find((v) => v.id === b.vendor_id)?.name || '—' : '—'}</Table.Cell>
                <Table.Cell color="gray.200" fontSize="sm" fontWeight="500">${Number(b.amount).toFixed(2)}</Table.Cell>
                <Table.Cell><Badge colorPalette={statusColors[b.status] || 'gray'} borderRadius="full" px={2} fontSize="xs">{b.status}</Badge></Table.Cell>
                <Table.Cell color="gray.400" fontSize="sm">{b.due_date || '—'}</Table.Cell>
                <Table.Cell>
                  <Flex gap={1}>
                    <Button size="xs" variant="ghost" color="gray.500" _hover={{ color: 'gray.200', bg: '#1a1a2e' }} borderRadius="md" onClick={() => openEdit(b)} disabled={loadingEdit === b.id}>
                      {loadingEdit === b.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Pencil size={13} />}
                    </Button>
                    <Button size="xs" variant="ghost" color="gray.600" _hover={{ color: 'red.400', bg: '#1a1a2e' }} borderRadius="md" onClick={() => handleDelete(b.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            )) : (
              <Table.Row>
                <Table.Cell colSpan={6} textAlign="center" py={16}>
                  <Flex direction="column" align="center" gap={2}>
                    <Receipt size={32} color="#2d2d45" />
                    <Text fontSize="sm" fontWeight="500" color="gray.600">No vendor bills yet</Text>
                    <Text fontSize="xs" color="gray.700">Add a bill manually or use Mass Upload</Text>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
        </Box>
      </Box>

      <Dialog.Root open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)} size="lg">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="#13131f" border="1px solid #1e1e35" borderRadius="2xl">
            <Dialog.Header borderBottom="1px solid #1e1e35" pb={4}>
              <Box>
                <Text fontWeight="700" fontSize="md" color="gray.100" letterSpacing="-0.02em">
                  {editing ? 'Edit Vendor Bill' : 'New Vendor Bill'}
                </Text>
                <Text fontSize="xs" color="gray.500" mt={0.5}>
                  {editing ? `Editing #${editing.bill_number}` : 'Fill in the details below'}
                </Text>
              </Box>
              <Button size="sm" variant="ghost" color="gray.600" _hover={{ color: 'gray.300' }} ml="auto" onClick={() => setDialogOpen(false)}>
                <X size={16} />
              </Button>
            </Dialog.Header>
            <Dialog.Body py={5}>
              <Stack gap={4}>
                <Field.Root required>
                  <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Bill Number</Field.Label>
                  <Input {...fieldStyle} value={form.bill_number} onChange={(e) => setForm({ ...form, bill_number: e.target.value })} placeholder="BILL-001" />
                </Field.Root>

                <Flex gap={3}>
                  <Field.Root flex={1}>
                    <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Vendor</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field {...fieldStyle} value={form.vendor_id || ''} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
                        <option value="">No vendor</option>
                        {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                  <Field.Root w="160px">
                    <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Status</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field {...fieldStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                </Flex>

                <Flex gap={3}>
                  <Field.Root flex={1}>
                    <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Due Date</Field.Label>
                    <Input {...fieldStyle} type="date" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </Field.Root>
                  <Field.Root w="140px">
                    <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Tax ($)</Field.Label>
                    <Input {...fieldStyle} type="number" value={form.tax || 0} onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })} />
                  </Field.Root>
                </Flex>

                <Field.Root>
                  <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Description</Field.Label>
                  <Input {...fieldStyle} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional note" />
                </Field.Root>

                <Box>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Text fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Line Items</Text>
                    <Button size="xs" variant="outline" borderColor="#1e1e35" color="gray.400" _hover={{ bg: '#1a1a2e', color: 'gray.200' }} borderRadius="lg" onClick={addItem} gap={1}>
                      <Plus size={12} /> Add
                    </Button>
                  </Flex>
                  {form.items.length === 0 && (
                    <Box py={4} textAlign="center" border="1px dashed" borderColor="#1e1e35" borderRadius="lg">
                      <Text fontSize="xs" color="gray.700">No line items. Click "Add" to start.</Text>
                    </Box>
                  )}
                  <Stack gap={2}>
                    {form.items.map((item, idx) => (
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
                  {form.items.length > 0 && (
                    <Flex justify="flex-end" mt={3} pt={3} borderTop="1px solid" borderColor="#1e1e35">
                      <Text fontSize="sm" fontWeight="700" color="gray.200">Total: ${totalAmount.toFixed(2)}</Text>
                    </Flex>
                  )}
                </Box>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid #1e1e35" pt={4} gap={2}>
              <Button variant="ghost" color="gray.500" _hover={{ color: 'gray.300', bg: '#1a1a2e' }} borderRadius="lg" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!form.bill_number || form.items.length === 0}
                bg="violet.600"
                color="white"
                _hover={{ bg: 'violet.700' }}
                borderRadius="lg"
                fontWeight="600"
              >
                {editing ? 'Save Changes' : 'Create Bill'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
