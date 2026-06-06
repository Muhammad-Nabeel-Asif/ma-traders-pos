import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Typography,
  Popconfirm,
  App as AntApp,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api';
import { useTowns } from '../../lib/queries';
import type { Town } from '../../lib/types';

const { Title } = Typography;

export default function Towns() {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useTowns(search);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Town | null>(null);
  const [form] = Form.useForm();

  const save = useMutation({
    mutationFn: async (values: Partial<Town>) => {
      if (editing) return api.put(`/towns/${editing.id}`, values);
      return api.post('/towns', values);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['towns'] });
      message.success('Saved');
      setOpen(false);
    },
    onError: (e) => message.error(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/towns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['towns'] });
      message.success('Deleted');
    },
    onError: (e) => message.error(apiError(e)),
  });

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };
  const openEdit = (t: Town) => {
    setEditing(t);
    form.setFieldsValue(t);
    setOpen(true);
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          Towns
        </Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Search towns"
            onSearch={setSearch}
            onChange={(e) => !e.target.value && setSearch('')}
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            New Town
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Code', dataIndex: 'code', width: 140 },
          {
            title: 'Actions',
            width: 130,
            render: (_, r: Town) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                <Popconfirm title="Delete this town?" onConfirm={() => remove.mutate(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'Edit Town' : 'New Town'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="name" label="Town Name" rules={[{ required: true }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="code" label="Code">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
