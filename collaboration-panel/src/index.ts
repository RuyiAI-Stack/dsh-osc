/**
 * Collaboration board HTTP API and web client for OSC.
 * @module dsh-osc-collaboration-panel
 */

import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { handleItems } from './web/api/items.ts'

export const name = 'collaboration-panel'
export const inject = ['role', 'webServer']

export type {
  BoardDetail,
  BoardEntry,
  BoardError,
  BoardItem,
  Kind,
} from './web/libs/board.ts'
export {
  issueSearchQuery,
  mapDetail,
  mapSearchItem,
  prSearchQuery,
} from './web/libs/board.ts'
export { getDetail, listItems } from './web/libs/items.ts'

export function apply(ctx: Context) {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: '/integrations/collaboration-panel/items',
        handler: (req, res) => void handleItems(ctx, req, res),
      }),
    'collaboration-panel: api',
  )
}
