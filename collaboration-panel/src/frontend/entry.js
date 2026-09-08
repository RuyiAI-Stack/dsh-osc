function CollabView() {
  return h('div', { id: PANEL_ID, className: 'dsh-collaboration-view' }, h(Panel))
}

function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, 'collaboration-panel: styles')
  ctx.slots.inject('conversation.view', () => ctx.slots.register(
    { name: 'conversation.view', id: 'collaboration', order: 15, label: '协作' },
    CollabView,
  ))
}
