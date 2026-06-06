import { useState } from 'react';
import { Card, Form, Input, Button, Typography, App as AntApp } from 'antd';
import { ShopOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { apiError } from '../lib/api';

const { Title, Text } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const login = useAuth((s) => s.login);
  const user = useAuth((s) => s.user);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      navigate('/');
    } catch (err) {
      message.error(apiError(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
      }}
    >
      <Card style={{ width: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <ShopOutlined style={{ fontSize: 40, color: '#1565c0' }} />
          <Title level={3} style={{ margin: '8px 0 0' }}>
            MA Traders
          </Title>
          <Text type="secondary">Distribution Management System</Text>
        </div>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ username: 'admin' }}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Enter username' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" size="large" autoFocus />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Enter password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Sign In
          </Button>
        </Form>
        <Text type="secondary" style={{ display: 'block', marginTop: 12, textAlign: 'center', fontSize: 12 }}>
          Default login: admin / admin123
        </Text>
      </Card>
    </div>
  );
}
