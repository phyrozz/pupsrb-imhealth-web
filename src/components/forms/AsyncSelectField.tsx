import { Alert, Button, Group, Loader, Select, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';

export interface AsyncSelectPage<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}

export interface AsyncSelectFieldProps<T>
  extends Omit<ComponentProps<typeof Select>, 'data' | 'onChange' | 'searchValue' | 'onSearchChange' | 'value'> {
  loadPage: (query: string, page: number, signal: AbortSignal) => Promise<AsyncSelectPage<T>>;
  getOptionValue: (item: T) => string;
  getOptionLabel: (item: T) => string;
  value: string | null;
  onChange: (value: string | null) => void;
  /** The number of milliseconds to wait before requesting a changed search query. */
  searchDebounceMs?: number;
}

type LoadState = 'loading' | 'loaded' | 'error';

/**
 * A controlled select that queries one page at a time. It handles debounced search,
 * cancellation, retrying, and requesting the next page near the bottom of its menu.
 */
export default function AsyncSelectField<T>({
  loadPage,
  getOptionValue,
  getOptionLabel,
  value,
  onChange,
  searchDebounceMs = 300,
  disabled,
  nothingFoundMessage,
  scrollAreaProps,
  ...selectProps
}: AsyncSelectFieldProps<T>) {
  const [query, setQuery] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [items, setItems] = useState<T[]>([]);
  const [cachedItems, setCachedItems] = useState<T[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const failedRequestRef = useRef<{ query: string; page: number; append: boolean } | null>(null);

  const mergeItems = useCallback((current: T[], incoming: T[]) => {
    const knownValues = new Set(current.map(getOptionValue));
    return [...current, ...incoming.filter((item) => {
      const itemValue = getOptionValue(item);
      if (knownValues.has(itemValue)) return false;
      knownValues.add(itemValue);
      return true;
    })];
  }, [getOptionValue]);

  const fetchPage = useCallback(async (nextQuery: string, nextPage: number, append: boolean) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const request = ++requestRef.current;
    failedRequestRef.current = null;
    setState('loading');

    try {
      const result = await loadPage(nextQuery, nextPage, controller.signal);
      if (controller.signal.aborted || request !== requestRef.current) return;
      setItems((current) => append ? mergeItems(current, result.items) : mergeItems([], result.items));
      setCachedItems((current) => mergeItems(current, result.items));
      setPage(result.page);
      setHasMore(result.has_more);
      setState('loaded');
    } catch {
      if (!controller.signal.aborted && request === requestRef.current) {
        failedRequestRef.current = { query: nextQuery, page: nextPage, append };
        setState('error');
      }
    } finally {
      if (request === requestRef.current) loadingMoreRef.current = false;
    }
  }, [loadPage, mergeItems]);

  useEffect(() => {
    const delay = query ? searchDebounceMs : 0;
    const timeout = window.setTimeout(() => {
      loadingMoreRef.current = false;
      setItems([]);
      setPage(1);
      setHasMore(false);
      void fetchPage(query, 1, false);
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [fetchPage, query, searchDebounceMs]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const loadNextPage = useCallback(() => {
    if (state !== 'loaded' || !hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    void fetchPage(query, page + 1, true);
  }, [fetchPage, hasMore, page, query, state]);

  const handleScrollPositionChange = useCallback((position: { x: number; y: number }) => {
    scrollAreaProps?.onScrollPositionChange?.(position);
    const viewport = viewportRef.current;
    if (viewport && position.y >= viewport.scrollHeight - viewport.clientHeight - 24) loadNextPage();
  }, [loadNextPage, scrollAreaProps]);

  const handleSearchChange = useCallback((nextQuery: string) => {
    const selectedItem = cachedItems.find((item) => getOptionValue(item) === value);
    if (selectedItem && nextQuery === getOptionLabel(selectedItem)) {
      setSearchValue(nextQuery);
      return;
    }
    if (nextQuery === searchValue) return;
    setSearchValue(nextQuery);
    if (nextQuery === query) return;
    controllerRef.current?.abort();
    requestRef.current += 1;
    loadingMoreRef.current = false;
    failedRequestRef.current = null;
    setItems([]);
    setPage(1);
    setHasMore(false);
    setState('loading');
    setQuery(nextQuery);
  }, [cachedItems, getOptionLabel, getOptionValue, query, searchValue, value]);

  const handleChange = useCallback((nextValue: string | null) => {
    const selectedItem = cachedItems.find((item) => getOptionValue(item) === nextValue);
    const label = selectedItem ? getOptionLabel(selectedItem) : null;
    setSearchValue(label ?? '');
    onChange(nextValue);
  }, [cachedItems, getOptionLabel, getOptionValue, onChange]);

  const retry = useCallback(() => {
    const failedRequest = failedRequestRef.current;
    if (failedRequest) void fetchPage(failedRequest.query, failedRequest.page, failedRequest.append);
  }, [fetchPage]);

  const selectedItem = cachedItems.find((item) => getOptionValue(item) === value);
  const options = selectedItem
    ? mergeItems([selectedItem], items).map((item) => ({ value: getOptionValue(item), label: getOptionLabel(item) }))
    : items.map((item) => ({ value: getOptionValue(item), label: getOptionLabel(item) }));
  const isInitialLoading = state === 'loading' && items.length === 0;
  const noResults = state === 'loaded' && items.length === 0;

  return (
    <>
      <Select
        {...selectProps}
        data={options}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        searchable
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        nothingFoundMessage={isInitialLoading ? 'Loading options...' : noResults ? (nothingFoundMessage ?? 'No matching options') : undefined}
        rightSection={isInitialLoading ? <Loader size="xs" aria-label="Loading options" /> : selectProps.rightSection}
        scrollAreaProps={{ ...scrollAreaProps, viewportRef, onScrollPositionChange: handleScrollPositionChange }}
      />
      <div aria-live="polite">
        {state === 'error' && (
          <Alert color="red" icon={<IconAlertCircle size={16} />} mt="xs" role="alert">
            <Text size="sm">Unable to load options.</Text>
            <Button type="button" variant="light" color="red" size="xs" mt="xs" onClick={retry}>Retry</Button>
          </Alert>
        )}
        {state === 'loaded' && hasMore && (
          <Group gap="xs" mt="xs" role="status">
            <Text size="xs" c="dimmed">Scroll for more options</Text>
          </Group>
        )}
        {state === 'loading' && items.length > 0 && (
          <Group gap="xs" mt="xs" role="status">
            <Loader size="xs" aria-hidden="true" />
            <Text size="xs" c="dimmed">Loading more options...</Text>
          </Group>
        )}
      </div>
    </>
  );
}
