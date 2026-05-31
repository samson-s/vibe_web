'use client';
import { Box, Flex, Button, Heading, Stack, Text } from '@chakra-ui/react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Receipt, Building2, Upload, LogOut } from 'lucide-react';
import { useEffect } from 'react';

const navItems = [
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/vendor-bills', label: 'Vendor Bills', icon: Receipt },
  { path: '/mass-upload', label: 'Mass Upload', icon: Upload },
  { path: '/vendors', label: 'Vendors', icon: Building2 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <Box minH="100vh" bg="gray.950" display="flex">
      <Box w="240px" bg="gray.900" borderRight="1px" borderColor="gray.800" display="flex" flexDirection="column" flexShrink={0}>
        <Box px={5} py={4} borderBottom="1px" borderColor="gray.800">
          <Heading color="blue.400">AI Billing System</Heading>
        </Box>
        <Stack gap={1} p={3} flex={1}>
          {navItems.map((item) => {
            const active = pathname === item.path;
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant={active ? 'solid' : 'ghost'}
                colorScheme={active ? 'blue' : 'gray'}
                bg={active ? 'blue.600' : undefined}
                color={active ? 'white' : 'gray.400'}
                _hover={!active ? { bg: 'gray.800', color: 'white' } : undefined}
                justifyContent="flex-start"
                onClick={() => router.push(item.path)}
                px={3}
              >
                <Icon size={16} />
                <Text ml={2}>{item.label}</Text>
              </Button>
            );
          })}
        </Stack>
        <Box p={3} borderTop="1px" borderColor="gray.800">
          <Button variant="ghost" w="full" justifyContent="flex-start" color="gray.400" _hover={{ bg: 'gray.800', color: 'white' }} onClick={logout}>
            <LogOut size={16} /> <Text ml={2}>Logout</Text>
          </Button>
        </Box>
      </Box>
      <Box flex={1} display="flex" flexDirection="column" bg="gray.950">
        <Box p={6}>{children}</Box>
      </Box>
    </Box>
  );
}
