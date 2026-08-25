import sampleSpec from '@/data/sample-openapi.json'
import petStoreSpec from '@/data/sample-petstore-openapi.json'
import { parseOpenApiValue, type ParsedSpec } from '@/lib/openapi'

export type BundledSpec = {
  id: string
  name: string
  spec: ParsedSpec
}

export const bundledSpecs: BundledSpec[] = [
  {
    id: 'harbor-books',
    name: 'Harbor Books',
    spec: parseOpenApiValue(sampleSpec),
  },

    {
    id: 'pet-store',
    name: 'Pet Store',
    spec: parseOpenApiValue(petStoreSpec),
  },
]