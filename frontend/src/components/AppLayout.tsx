import { Layout, Menu, Dropdown, Avatar, Tag, Button } from 'antd';
import {
  ShopOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  DollarOutlined,
  WalletOutlined,
  BookOutlined,
  SolutionOutlined,
  FundOutlined,
  CalendarOutlined,
  ShoppingCartOutlined,
  UnorderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  {
    key: 'g-sale',
    type: 'group' as const,
    label: 'Sales',
    children: [
      { key: '/sale', icon: <ShoppingCartOutlined />, label: 'New Sale' },
      { key: '/sales', icon: <UnorderedListOutlined />, label: 'Sales List' },
    ],
  },
  {
    key: 'g-masters',
    type: 'group' as const,
    label: 'Master Data',
    children: [
      { key: '/accounts', icon: <ShopOutlined />, label: 'Accounts' },
      { key: '/products', icon: <AppstoreOutlined />, label: 'Products' },
      { key: '/towns', icon: <EnvironmentOutlined />, label: 'Towns' },
      { key: '/salesmen', icon: <TeamOutlined />, label: 'Salesmen' },
    ],
  },
  {
    key: 'g-cash',
    type: 'group' as const,
    label: 'Cash',
    children: [
      { key: '/cash-receive', icon: <DollarOutlined />, label: 'Cash Receive' },
      { key: '/cash-payment', icon: <WalletOutlined />, label: 'Cash Payment' },
    ],
  },
  {
    key: 'g-reports',
    type: 'group' as const,
    label: 'Reports',
    children: [
      { key: '/ledger', icon: <BookOutlined />, label: 'Ledger' },
      { key: '/salesman-ledger', icon: <SolutionOutlined />, label: 'Salesman Ledger' },
      { key: '/all-balance', icon: <FundOutlined />, label: 'All Balance' },
      { key: '/daily-report', icon: <CalendarOutlined />, label: 'Daily Report' },
    ],
  },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        width={232}
        theme="light"
        style={{ borderRight: '1px solid #e8e8e8', overflow: 'auto' }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            fontWeight: 700,
            fontSize: 16,
            color: '#1565c0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <ShopOutlined style={{ fontSize: 20 }} />
          MA Traders
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e8e8e8',
            height: 56,
            lineHeight: '56px',
          }}
        >
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => navigate('/sale')}
          >
            New Sale
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Logout',
                  onClick: () => {
                    logout();
                    navigate('/login');
                  },
                },
              ],
            }}
          >
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.fullName || user?.username}</span>
              <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                {user?.role}
              </Tag>
            </span>
          </Dropdown>
        </Header>
        <Content style={{ padding: 16, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
