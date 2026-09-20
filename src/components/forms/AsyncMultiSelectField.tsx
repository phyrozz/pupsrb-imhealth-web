import { Alert, Button, Group, Loader, MultiSelect, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import type { AsyncSelectPage } from './AsyncSelectField';

export interface AsyncMultiSelectFieldProps<T>
  extends Omit<ComponentProps<typeof MultiSelect>, 'data' | 'onChange' | 'searchValue' | 'onSearchChange' | 'value'> {
  loadPage: (query: string, page: number, signal: AbortSignal) => Promise<AsyncSelectPage<T>>;
  getOptionValue: (item: T) => string;
  getOptionLabel: (item: T) => string;
  value: string[];
  onChange: (value: string[]) => void;
  /** Options kept visible independently of the API search results, such as an All filter. */
  pinnedOptions?: { value: string; label: string }[];
  searchDebounceMs?: number;
}

type LoadState = 'loading' | 'loaded' | 'error';

/** A searchable multiple-chip select that loads matching options from an API page by page. */
export default function AsyncMultiSelectField<T>({
  loadPage,
  getOptionValue,
  getOptionLabel,
  value,
  onChange,
  pinnedOptions = [],
  searchDebounceMs = 300,
  disabled,
  nothingFoundMessage,
  scrollAreaProps,
  ...selectProps
}: AsyncMultiSelectFieldProps<T>) {
  const [query, setQuery] = useState('');
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
    const values = new Set(current.map(getOptionValue));
    return [...current, ...incoming.filter((item) => {
      const itemValue = getOptionValue(item);
      if (values.has(itemValue)) return false;
      values.add(itemValue);
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

  const handleSearchChange = useCallback((nextQuery: string) => {
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
  }, [query]);

  const handleScrollPositionChange = useCallback((position: { x: number; y: number }) => {
    scrollAreaProps?.onScrollPositionChange?.(position);
    const viewport = viewportRef.current;
    if (viewport && position.y >= viewport.scrollHeight - viewport.clientHeight - 24) loadNextPage();
  }, [loadNextPage, scrollAreaProps]);

  const retry = useCallback(() => {
    const failedRequest = failedRequestRef.current;
    if (failedRequest) void fetchPage(failedRequest.query, failedRequest.page, failedRequest.append);
  }, [fetchPage]);

  const selectedItems = cachedItems.filter((item) => value.includes(getOptionValue(item)));
  const fetchedOptions = mergeItems(selectedItems, items).map((item) => ({
    value: getOptionValue(item),
    label: getOptionLabel(item),
  }));
  const options = [...pinnedOptions, ...fetchedOptions.filter((option) =>
    !pinnedOptions.some((pinned) => pinned.value === option.value)
  )];
  const isInitialLoading = state === 'loading' && items.length === 0;
  const noResults = state === 'loaded' && items.length === 0;

  return (
    <>
      <MultiSelect
        {...selectProps}
        data={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        searchable
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
        {state === 'loaded' && hasMore && <Group gap="xs" mt="xs" role="status"><Text size="xs" c="dimmed">Scroll for more options</Text></Group>}
        {state === 'loading' && items.length > 0 && <Group gap="xs" mt="xs" role="status"><Loader size="xs" aria-hidden="true" /><Text size="xs" c="dimmed">Loading more options...</Text></Group>}
      </div>
    </>
  );
}
