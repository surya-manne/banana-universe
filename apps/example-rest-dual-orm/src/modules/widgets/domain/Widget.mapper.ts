import type { Repository } from '@banana-universe/ddd'
import type { InjectionToken } from 'tsyringe'
import type { Widget } from './Widget.entity.js'

export type WidgetMapper = Repository<Widget>

export const WidgetMapperToken = Symbol('WidgetMapper') as InjectionToken<WidgetMapper>
