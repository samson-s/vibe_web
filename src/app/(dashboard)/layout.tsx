'use client';
import { Box, Flex, Button, Text, Stack } from '@chakra-ui/react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Receipt, Building2, Upload, LogOut, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

const navItems = [
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/vendor-bills', label: 'Vendor Bills', icon: Receipt },
  { path: '/mass-upload', label: 'Mass Upload', icon: Upload },
  { path: '/vendors', label: 'Vendors', icon: Building2 },
];

function SidebarContent({
  collapsed,
  onNavigate,
  onToggleCollapse,
  onLogout,
  pathname,
  showCollapseBtn,
}: {
  collapsed: boolean;
  onNavigate: (path: string) => void;
  onToggleCollapse?: () => void;
  onLogout: () => void;
  pathname: string;
  showCollapseBtn: boolean;
}) {
  return (
    <Flex direction="column" h="full" overflow="hidden">
      {/* Brand */}
      <Flex
        align="center"
        justify={collapsed ? 'center' : 'flex-start'}
        px={collapsed ? 0 : 4}
        py={5}
        borderBottom="1px solid"
        borderColor="#1a1a2e"
        flexShrink={0}
      >
        {!collapsed && (
          <Box>
            <Text fontWeight="700" fontSize="sm" letterSpacing="-0.02em" color="gray.100" lineHeight="1.2">
              Vibe Billing
            </Text>
            <Text fontSize="10px" color="gray.600" letterSpacing="0.06em" textTransform="uppercase" lineHeight="1.4">
              AI-Powered
            </Text>
          </Box>
        )}
      </Flex>

      {/* Nav */}
      <Stack gap={0.5} p={2} flex={1} overflow="auto">
        {!collapsed && (
          <Text fontSize="10px" color="gray.700" fontWeight="600" letterSpacing="0.08em" textTransform="uppercase" px={2} pt={2} pb={1}>
            Menu
          </Text>
        )}
        {collapsed && <Box h={3} />}
        {navItems.map((item) => {
          const active = pathname === item.path;
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              variant="ghost"
              w="full"
              justifyContent={collapsed ? 'center' : 'flex-start'}
              size="sm"
              h="36px"
              px={collapsed ? 0 : 3}
              borderRadius="lg"
              bg={active ? 'violet.950' : 'transparent'}
              color={active ? 'violet.400' : 'gray.500'}
              _hover={!active ? { bg: '#13132a', color: 'gray.300' } : {}}
              onClick={() => onNavigate(item.path)}
              fontWeight={active ? '600' : '400'}
              fontSize="sm"
              gap={collapsed ? 0 : 2.5}
              borderLeft={active ? '2px solid' : '2px solid transparent'}
              borderColor={active ? 'violet.500' : 'transparent'}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={15} />
              {!collapsed && item.label}
            </Button>
          );
        })}
      </Stack>

      {/* Footer */}
      <Box flexShrink={0}>
        <Box p={2} borderTop="1px solid" borderColor="#1a1a2e">
          {collapsed ? (
            <Flex justify="center">
              <Button
                variant="ghost" size="sm" w="36px" h="36px" p={0} borderRadius="lg"
                color="gray.600" _hover={{ bg: '#13132a', color: 'gray.400' }}
                onClick={onLogout} title="Sign out"
              >
                <LogOut size={14} />
              </Button>
            </Flex>
          ) : (
            <Button
              variant="ghost" w="full" justifyContent="flex-start" size="sm" h="36px" px={3}
              borderRadius="lg" color="gray.600" _hover={{ bg: '#13132a', color: 'gray.400' }}
              onClick={onLogout} gap={2.5} fontSize="sm"
            >
              <LogOut size={14} /> Sign out
            </Button>
          )}
        </Box>

        {showCollapseBtn && (
          <Box px={2} pb={2}>
            <Flex justify={collapsed ? 'center' : 'flex-end'}>
              <Button
                variant="ghost" size="sm" w="28px" h="28px" p={0} borderRadius="md"
                color="gray.700" _hover={{ bg: '#13132a', color: 'gray.400' }}
                onClick={onToggleCollapse}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
              </Button>
            </Flex>
          </Box>
        )}
      </Box>
    </Flex>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (!isAuthenticated) return null;

  const navigate = (path: string) => { router.push(path); setMobileOpen(false); };

  return (
    <Box h="100dvh" bg="gray.950" display="flex" flexDirection="column" overflow="hidden">

      {/* ── Mobile top bar ── */}
      <Flex
        display={{ base: 'flex', md: 'none' }}
        align="center"
        px={3}
        py={2.5}
        bg="#0c0c17"
        borderBottom="1px solid"
        borderColor="#1a1a2e"
        position="sticky"
        top={0}
        zIndex={100}
        gap={3}
      >
        <Button
          variant="ghost" size="sm" p={2} borderRadius="lg"
          color="gray.400" _hover={{ color: 'gray.200', bg: '#13132a' }}
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={18} />
        </Button>
        <Text fontWeight="700" fontSize="sm" color="gray.100" letterSpacing="-0.02em">Vibe Billing</Text>
      </Flex>

      {/* ── Body row ── */}
      <Flex flex={1} minH={0} overflow="hidden">

        {/* Desktop sidebar */}
        <Box
          display={{ base: 'none', md: 'block' }}
          flexShrink={0}
          w={collapsed ? '60px' : '224px'}
          style={{ transition: 'width 0.2s ease' }}
          bg="#0c0c17"
          borderRight="1px solid"
          borderColor="#1a1a2e"
          h="full"
        >
          <SidebarContent
            collapsed={collapsed}
            onNavigate={navigate}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            onLogout={logout}
            pathname={pathname ?? ''}
            showCollapseBtn
          />
        </Box>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <Box
              display={{ base: 'block', md: 'none' }}
              position="fixed"
              inset={0}
              zIndex={200}
              bg="rgba(0,0,0,0.6)"
              onClick={() => setMobileOpen(false)}
            />
            {/* Panel */}
            <Box
              display={{ base: 'flex', md: 'none' }}
              flexDirection="column"
              position="fixed"
              top={0}
              left={0}
              bottom={0}
              w="240px"
              bg="#0c0c17"
              borderRight="1px solid"
              borderColor="#1a1a2e"
              zIndex={201}
            >
              <Flex justify="flex-end" px={2} pt={2} flexShrink={0}>
                <Button
                  variant="ghost" size="sm" p={2} borderRadius="lg"
                  color="gray.500" _hover={{ color: 'gray.200' }}
                  onClick={() => setMobileOpen(false)}
                >
                  <X size={16} />
                </Button>
              </Flex>
              <Box flex={1} minH={0}>
                <SidebarContent
                  collapsed={false}
                  onNavigate={navigate}
                  onLogout={logout}
                  pathname={pathname ?? ''}
                  showCollapseBtn={false}
                />
              </Box>
            </Box>
          </>
        )}

        {/* Main content */}
        <Box flex={1} overflow="auto" p={{ base: 4, md: 7 }}>
          <Box maxW="1100px" mx="auto">
            {children}
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
