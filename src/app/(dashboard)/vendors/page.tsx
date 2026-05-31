'use client';
import { useEffect, useState } from 'react';
import {
  Box, Button, Input, Stack, Heading, Table, Dialog, Field, Alert, Flex,
} from '@chakra-ui/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { listVendors, createVendor, updateVendor, deleteVendor, type Vendor, type CreateVendorRequest, type UpdateVendorRequest } from '@/services/vendors';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<CreateVendorRequest>({ name: '', email: '', phone: '', address: '' });

  const load = async () => {
    setLoading(true);
    try {
      setVendors(await listVendors());
    } catch { setError('Failed to load vendors'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', address: '' });
    setDialogOpen(true);
  };

  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({ name: v.name, email: v.email, phone: v.phone, address: v.address });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        const update: UpdateVendorRequest = {};
        if (form.name !== editing.name) update.name = form.name;
        if (form.email !== editing.email) update.email = form.email || null;
        if (form.phone !== editing.phone) update.phone = form.phone || null;
        if (form.address !== editing.address) update.address = form.address || null;
        await updateVendor(editing.id, update);
      } else {
        await createVendor(form);
      }
      setDialogOpen(false);
      await load();
    } catch { setError('Failed to save vendor'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this vendor?')) return;
    try {
      await deleteVendor(id);
      await load();
    } catch { setError('Failed to delete vendor'); }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg" color={"gray.100"}>Vendors</Heading>
        <Button onClick={openCreate}><Plus size={16} /> Add Vendor</Button>
      </Flex>
      {error && <Alert.Root status="error" mb={4}><Alert.Indicator /><Alert.Title>{error}</Alert.Title></Alert.Root>}
      <Box bg="gray.100" borderRadius="md" boxShadow="sm" overflow="auto">
        <Table.Root variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
              <Table.ColumnHeader>Email</Table.ColumnHeader>
              <Table.ColumnHeader>Phone</Table.ColumnHeader>
              <Table.ColumnHeader>Address</Table.ColumnHeader>
              <Table.ColumnHeader w="120px">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {vendors.length > 0 ? vendors.map((v) => (
              <Table.Row key={v.id}>
                <Table.Cell fontWeight="medium">{v.name}</Table.Cell>
                <Table.Cell>{v.email || '-'}</Table.Cell>
                <Table.Cell>{v.phone || '-'}</Table.Cell>
                <Table.Cell>{v.address || '-'}</Table.Cell>
                <Table.Cell>
                  <Flex gap={2}>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(v)}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" colorScheme="red" onClick={() => handleDelete(v.id)}><Trash2 size={14} /></Button>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            )) : (
              <Table.Row><Table.Cell colSpan={5} textAlign="center" color="gray.500">No vendors found</Table.Cell></Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>{editing ? 'Edit Vendor' : 'Add Vendor'}</Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Field.Root required>
                  <Field.Label>Name</Field.Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Email</Field.Label>
                  <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Phone</Field.Label>
                  <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Address</Field.Label>
                  <Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </Field.Root>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name}>{editing ? 'Update' : 'Create'}</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
