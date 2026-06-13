'use client';
import { useEffect, useState } from 'react';
import {
  Box, Button, Input, Stack, Heading, Table, Dialog, Field, Alert, Flex, Text,
} from '@chakra-ui/react';
import { Plus, Pencil, Trash2, Building2, X } from 'lucide-react';
import { listVendors, createVendor, updateVendor, deleteVendor, type Vendor, type CreateVendorRequest, type UpdateVendorRequest } from '@/services/vendors';

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

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<CreateVendorRequest>({ name: '', email: '', phone: '', address: '' });

  const load = async () => {
    setLoading(true);
    try { setVendors(await listVendors()); }
    catch { setError('Failed to load vendors'); }
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
    try { await deleteVendor(id); await load(); }
    catch { setError('Failed to delete vendor'); }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" color="gray.50" fontWeight="700" letterSpacing="-0.03em">Vendors</Heading>
          <Text fontSize="sm" color="gray.500" mt={0.5}>Manage your vendor contacts</Text>
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
          <Plus size={15} /> Add Vendor
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
              <Table.ColumnHeader color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Name</Table.ColumnHeader>
              <Table.ColumnHeader color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Email</Table.ColumnHeader>
              <Table.ColumnHeader color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Phone</Table.ColumnHeader>
              <Table.ColumnHeader color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Address</Table.ColumnHeader>
              <Table.ColumnHeader w="100px" color="gray.500" fontSize="xs" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {vendors.length > 0 ? vendors.map((v) => (
              <Table.Row key={v.id} _hover={{ bg: '#0f0f1a' }} transition="background 0.1s">
                <Table.Cell fontWeight="600" color="gray.100" fontSize="sm">{v.name}</Table.Cell>
                <Table.Cell color="gray.400" fontSize="sm">{v.email || '—'}</Table.Cell>
                <Table.Cell color="gray.400" fontSize="sm">{v.phone || '—'}</Table.Cell>
                <Table.Cell color="gray.400" fontSize="sm">{v.address || '—'}</Table.Cell>
                <Table.Cell>
                  <Flex gap={1}>
                    <Button size="xs" variant="ghost" color="gray.500" _hover={{ color: 'gray.200', bg: '#1a1a2e' }} borderRadius="md" onClick={() => openEdit(v)}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="xs" variant="ghost" color="gray.600" _hover={{ color: 'red.400', bg: '#1a1a2e' }} borderRadius="md" onClick={() => handleDelete(v.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            )) : (
              <Table.Row>
                <Table.Cell colSpan={5} textAlign="center" py={16}>
                  <Flex direction="column" align="center" gap={2}>
                    <Building2 size={32} color="#2d2d45" />
                    <Text fontSize="sm" fontWeight="500" color="gray.600">No vendors yet</Text>
                    <Text fontSize="xs" color="gray.700">Add your first vendor to get started</Text>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
        </Box>
      </Box>

      <Dialog.Root open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="#13131f" border="1px solid #1e1e35" borderRadius="2xl">
            <Dialog.Header borderBottom="1px solid #1e1e35" pb={4}>
              <Box>
                <Text fontWeight="700" fontSize="md" color="gray.100" letterSpacing="-0.02em">
                  {editing ? 'Edit Vendor' : 'Add Vendor'}
                </Text>
                <Text fontSize="xs" color="gray.500" mt={0.5}>
                  {editing ? editing.name : 'Enter vendor contact details'}
                </Text>
              </Box>
              <Button size="sm" variant="ghost" color="gray.600" _hover={{ color: 'gray.300' }} ml="auto" onClick={() => setDialogOpen(false)}>
                <X size={16} />
              </Button>
            </Dialog.Header>
            <Dialog.Body py={5}>
              <Stack gap={4}>
                <Field.Root required>
                  <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Company Name</Field.Label>
                  <Input {...fieldStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" />
                </Field.Root>
                <Flex gap={3}>
                  <Field.Root flex={1}>
                    <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Email</Field.Label>
                    <Input {...fieldStyle} type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="billing@acme.com" />
                  </Field.Root>
                  <Field.Root flex={1}>
                    <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Phone</Field.Label>
                    <Input {...fieldStyle} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" />
                  </Field.Root>
                </Flex>
                <Field.Root>
                  <Field.Label fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase">Address</Field.Label>
                  <Input {...fieldStyle} value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City, Country" />
                </Field.Root>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid #1e1e35" pt={4} gap={2}>
              <Button variant="ghost" color="gray.500" _hover={{ color: 'gray.300', bg: '#1a1a2e' }} borderRadius="lg" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!form.name}
                bg="violet.600"
                color="white"
                _hover={{ bg: 'violet.700' }}
                borderRadius="lg"
                fontWeight="600"
              >
                {editing ? 'Save Changes' : 'Add Vendor'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
