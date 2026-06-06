import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Account, Product, Salesman, Town } from './types';

export function useTowns(q?: string) {
  return useQuery({
    queryKey: ['towns', q ?? ''],
    queryFn: async () => (await api.get<Town[]>('/towns', { params: { q } })).data,
  });
}

export function useSalesmen(q?: string) {
  return useQuery({
    queryKey: ['salesmen', q ?? ''],
    queryFn: async () =>
      (await api.get<Salesman[]>('/salesmen', { params: { q } })).data,
  });
}

export function useAccounts(params?: { q?: string; type?: string }) {
  return useQuery({
    queryKey: ['accounts', params ?? {}],
    queryFn: async () =>
      (await api.get<Account[]>('/accounts', { params })).data,
  });
}

export function useProducts(q?: string) {
  return useQuery({
    queryKey: ['products', q ?? ''],
    queryFn: async () =>
      (await api.get<Product[]>('/products', { params: { q } })).data,
  });
}
