import { Button } from './Button'
import { INavThumbnail } from '../types/NavThumbnail'

interface IThumbnailPanelProps {
  previousImages: INavThumbnail[]
  nextImages: INavThumbnail[]
  currentThumbnailUrl?: string
  collapsed: boolean
  onToggleCollapsed: () => void
  onNavigate: (id: string) => void
}

/**
 * A collapsible panel showing thumbnails of the previous and next images,
 * ordered newest (top) to oldest (bottom) with the current image highlighted.
 * @component
 */
const ThumbnailPanel = (props: IThumbnailPanelProps) => {
  if (props.collapsed) {
    return (
      <div className='flex w-8 flex-initial flex-col items-center border-l border-slate-700 bg-slate-800 pt-1'>
        <button
          type='button'
          title='Show nearby images'
          onClick={props.onToggleCollapsed}
        >
          <Button
            secondary
            xs
          >
            ‹
          </Button>
        </button>
      </div>
    )
  }

  return (
    <div className='flex w-44 flex-initial flex-col overflow-y-auto border-l border-slate-700 bg-slate-800 p-2'>
      <div className='mb-2 flex items-center justify-between'>
        <span className='text-sm text-slate-300'>Nearby</span>
        <button
          type='button'
          title='Hide nearby images'
          onClick={props.onToggleCollapsed}
        >
          <Button
            secondary
            xs
          >
            ›
          </Button>
        </button>
      </div>
      <div className='flex flex-col gap-2'>
        {props.previousImages.map((t) => (
          <button
            type='button'
            key={t.id}
            onClick={() => props.onNavigate(t.id)}
          >
            <img
              className='w-full rounded opacity-80 hover:opacity-100'
              alt='previous'
              src={t.thumbnailUrl}
            />
          </button>
        ))}
        {props.currentThumbnailUrl && (
          <img
            className='w-full rounded ring-2 ring-primary-500'
            alt='current'
            src={props.currentThumbnailUrl}
          />
        )}
        {props.nextImages.map((t) => (
          <button
            type='button'
            key={t.id}
            onClick={() => props.onNavigate(t.id)}
          >
            <img
              className='w-full rounded opacity-80 hover:opacity-100'
              alt='next'
              src={t.thumbnailUrl}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export { ThumbnailPanel }
