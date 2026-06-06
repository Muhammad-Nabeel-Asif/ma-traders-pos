import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Typography,
  Popconfirm,
  App as AntApp,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api';
import { useProducts } from '../../lib/queries';
import { formatPKR, toPaisa, toRupees } from '../../lib/money';
import type { Product } from '../../lib/types';

const { Title } = Typography;

export default function Products() {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProducts(search);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form] = Form.useForm();

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        code: values.code,
        name: values.name,
        cartonSize: values.cartonSize ?? 1,
        purchasePrice: toPaisa(values.purchasePrice ?? 0),
        salePrice: toPaisa(values.salePrice ?? 0),
        stockUnits: values.stockUnits ?? 0,
        active: values.active ?? true,
      };
      if (editing) return api.put(`/products/${editing.id}`, payload);
      return api.post('/products', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      message.success('Saved');
      setOpen(false);
    },
    onError: (e) => message.error(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      message.success('Deleted');
    },
    onError: (e) => message.error(apiError(e)),
  });

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ active: true, cartonSize: 1 });
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    form.setFieldsValue({
      ...p,
      purchasePrice: toRupees(p.purchasePrice),
      salePrice: toRupees(p.salePrice),
    });
    setOpen(true);
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          Products
        </Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Search products"
            onSearch={setSearch}
            onChange={(e) => !e.target.value && setSearch('')}
            style={{ width: 240 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            New Product
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={data}
        scroll={{ x: 800 }}
        columns={[
          { title: 'Code', dataIndex: 'code', width: 110 },
          { title: 'Name', dataIndex: 'name' },
          { title: 'Carton Size', dataIndex: 'cartonSize', width: 110, align: 'right' },
          {
            title: 'Purchase',
            dataIndex: 'purchasePrice',
            width: 120,
            align: 'right',
            render: (v: number) => formatPKR(v),
          },
          {
            title: 'Sale Rate',
            dataIndex: 'salePrice',
            width: 120,
            align: 'right',
            render: (v: number) => formatPKR(v),
          },
          {
            title: 'Stock (units)',
            dataIndex: 'stockUnits',
            width: 110,
            align: 'right',
          },
          {
            title: 'Actions',
            width: 110,
            render: (_, r: Product) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                <Popconfirm title="Delete this product?" onConfirm={() => remove.mutate(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'Edit Product' : 'New Product'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="code" label="Code" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input autoFocus />
            </Form.Item>
            <Form.Item name="name" label="Name" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item
              name="cartonSize"
              label="Units / Carton"
              style={{ flex: 1 }}
              tooltip="Number of pieces/boxes in one carton (Ctn)"
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="purchasePrice" label="Purchase Price (PKR/carton)" style={{ flex: 1 }}>
              <InputNumber min={0} step={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="salePrice" label="Sale Rate (PKR/carton)" style={{ flex: 1 }}>
              <InputNumber min={0} step={1} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="stockUnits" label="Opening Stock (units)" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
