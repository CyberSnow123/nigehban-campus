import { useQuery, type QueryKey } from '@tanstack/react-query'

export type ImageState = 'loading' | 'error' | 'empty' | 'ready'

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image'))
    reader.readAsDataURL(blob)
  })
}

/**
 * An image that needs the login token. An `<img src>` cannot send `Authorization`, so the image
 * is fetched through the API client and shown as a data URL. Kept in the query cache, so it is
 * fetched once. `load` must reject when the server answers with an error.
 */
export function useAuthedImage(
  key: QueryKey,
  load: () => Promise<Blob>,
  enabled = true,
): { src?: string; state: ImageState } {
  const query = useQuery({
    queryKey: key,
    queryFn: async () => toDataUrl(await load()),
    enabled,
    staleTime: Infinity, // a stored snapshot never changes
    retry: false,
  })
  if (!enabled) return { state: 'empty' }
  if (query.isPending) return { state: 'loading' }
  if (query.isError) return { state: 'error' }
  return { src: query.data, state: 'ready' }
}
