'use client';
import { useEffect, useState } from 'react';
import {
  Box, Button, Input, Stack, Heading, Table, Dialog, Field, Alert, Flex, Badge, NativeSelect, Text,
} from '@chakra-ui/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { listInvoices, createInvoice, updateInvoice, deleteInvoice, type Invoice, type CreateInvoiceRequest, type CreateLineItemRequest } from '@/services/invoices';
import { listVendors, type Vendor } from '@/services/vendors';

const statusColors: Record<string, string> = { draft: 'gray', sent: 'blue', paid: 'green', overdue: 'red', cancelled: 'orange' };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<CreateInvoiceRequest & { items: CreateLineItemRequest[] }>({
    invoice_number: '', vendor_id: '', amount: 0, tax: 0, status: 'draft', description: '', due_date: '', items: [],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [invList, venList] = await Promise.all([listInvoices(), listVendors()]);
      setInvoices(invList);
      setVendors(venList);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ invoice_number: '', vendor_id: '', amount: 0, tax: 0, status: 'draft', description: '', due_date: '', items: [] });
    setDialogOpen(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      invoice_number: inv.invoice_number,
      vendor_id: inv.vendor_id || '',
      amount: inv.amount,
      tax: inv.tax || 0,
      status: inv.status,
      description: inv.description || '',
      due_date: inv.due_date || '',
      items: inv.items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
    });
    setDialogOpen(true);
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit_price: 0 }] });
  };

  const updateItem = (idx: number, field: keyof CreateLineItemRequest, value: string | number) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const totalAmount = form.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

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
      if (editing) {
        await updateInvoice(editing.id, payload);
      } else {
        await createInvoice(payload);
      }
      setDialogOpen(false);
      await load();
    } catch { setError('Failed to save invoice'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this invoice?')) return;
    try { await deleteInvoice(id); await load(); }
    catch { setError('Failed to delete invoice'); }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg" color={"gray.100"}>Invoices</Heading>
        <Button onClick={openCreate}><Plus size={16} /> Add Invoice</Button>
      </Flex>
      {error && <Alert.Root status="error" mb={4}><Alert.Indicator /><Alert.Title>{error}</Alert.Title></Alert.Root>}
      <Box bg="gray.100" borderRadius="md" boxShadow="sm" overflow="auto">
        <Table.Root variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Invoice #</Table.ColumnHeader>
              <Table.ColumnHeader>Vendor</Table.ColumnHeader>
              <Table.ColumnHeader>Amount</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
              <Table.ColumnHeader>Due Date</Table.ColumnHeader>
              <Table.ColumnHeader w="120px">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {invoices.length > 0 ? invoices.map((inv) => (
              <Table.Row key={inv.id}>
                <Table.Cell fontWeight="medium">{inv.invoice_number}</Table.Cell>
                <Table.Cell>{vendors.find((v) => v.id === inv.vendor_id)?.name || inv.vendor_id || '-'}</Table.Cell>
                <Table.Cell>${Number(inv.amount).toFixed(2)}</Table.Cell>
                <Table.Cell><Badge colorPalette={statusColors[inv.status] || 'gray'}>{inv.status}</Badge></Table.Cell>
                <Table.Cell>{inv.due_date || '-'}</Table.Cell>
                <Table.Cell>
                  <Flex gap={2}>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(inv)}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" colorScheme="red" onClick={() => handleDelete(inv.id)}><Trash2 size={14} /></Button>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            )) : (
              <Table.Row><Table.Cell colSpan={6} textAlign="center">No invoices found</Table.Cell></Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)} size="lg">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>{editing ? 'Edit Invoice' : 'Add Invoice'}</Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Field.Root required>
                  <Field.Label>Invoice Number</Field.Label>
                  <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Vendor</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={form.vendor_id || ''} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
                      <option value="">No vendor</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Status</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Description</Field.Label>
                  <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Due Date</Field.Label>
                  <Input type="date" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Tax</Field.Label>
                  <Input type="number" value={form.tax || 0} onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })} />
                </Field.Root>

                <Box>
                  <Flex justify="space-between" align="center" mb={2}>
                    <Heading size="sm">Line Items</Heading>
                    <Button size="sm" variant="outline" onClick={addItem}><Plus size={14} /> Add Item</Button>
                  </Flex>
                  {form.items.map((item, idx) => (
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
                        <Button size="sm" variant="ghost" colorScheme="red" onClick={() => removeItem(idx)}><Trash2 size={14} /></Button>
                      </Box>
                    </Flex>
                  ))}
                  <Text fontWeight="bold" textAlign="right" mt={2}>Total: ${totalAmount.toFixed(2)}</Text>
                </Box>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.invoice_number || form.items.length === 0}>{editing ? 'Update' : 'Create'}</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
