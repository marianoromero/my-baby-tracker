<!-- src/lib/components/DeleteConfirmModal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte'
  
  export let show = false
  export let eventData = null
  
  const dispatch = createEventDispatcher()
  
  function confirm() {
    dispatch('confirm', eventData)
    show = false
  }
  
  function cancel() {
    dispatch('cancel')
    show = false
  }
  
  // Cerrar con Escape
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      cancel()
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="modal-overlay" on:click={cancel}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <h3>Eliminar {eventData?.event_timestamp && new Date(eventData.event_timestamp).getFullYear() === new Date().getFullYear() ? 'evento' : 'acción'}</h3>
      </div>
      
      <div class="modal-body">
        {#if eventData}
          <p>¿Estás seguro de que quieres eliminar {eventData.event_timestamp && new Date(eventData.event_timestamp).getFullYear() === new Date().getFullYear() ? 'este evento' : 'esta acción'}?</p>
          <div class="event-preview">
            <div class="event-icon" style="background-color: {eventData.subjects?.color}">
              <i class="fa-solid fa-trash"></i>
            </div>
            <div class="event-details">
              <div class="event-subject">
                <i class="fa-solid {eventData.subjects?.icon}"></i>
                {eventData.subjects?.name}
              </div>
              <div class="event-action">{eventData.action_name}</div>
              {#if eventData.event_timestamp && new Date(eventData.event_timestamp).getFullYear() === new Date().getFullYear()}
                <div class="event-time">{new Date(eventData.event_timestamp).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              {:else}
                <div class="event-time">Acción disponible</div>
              {/if}
            </div>
          </div>
          <p class="warning-text">Esta acción no se puede deshacer.</p>
        {/if}
      </div>
      
      <div class="modal-actions">
        <button class="btn-secondary" on:click={cancel}>
          <i class="fa-solid fa-times"></i>
          Cancelar
        </button>
        <button class="btn-danger" on:click={confirm}>
          <i class="fa-solid fa-trash"></i>
          Eliminar
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: var(--spacing-md);
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .modal-content {
    background: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 400px;
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .modal-header {
    padding: var(--spacing-lg);
    text-align: center;
    border-bottom: 1px solid var(--gray);
  }
  
  .modal-header i {
    font-size: 2.5rem;
    color: #ff6b6b;
    margin-bottom: var(--spacing-sm);
  }
  
  .modal-header h3 {
    margin: 0;
    color: var(--black);
    font-size: 1.3rem;
  }
  
  .modal-body {
    padding: var(--spacing-lg);
    text-align: center;
  }
  
  .modal-body p {
    margin: 0 0 var(--spacing-lg);
    color: var(--gray-dark);
    font-size: 1rem;
  }
  
  .event-preview {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--gray-light);
    border-radius: var(--radius-lg);
    margin: var(--spacing-lg) 0;
    text-align: left;
  }
  
  .event-icon {
    width: 50px;
    height: 50px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--white);
    flex-shrink: 0;
  }
  
  .event-icon i {
    font-size: 1.2rem;
  }
  
  .event-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .event-subject {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 600;
    color: var(--black);
    font-size: 0.9rem;
  }
  
  .event-subject i {
    font-size: 0.8rem;
    color: var(--gray-dark);
  }
  
  .event-action {
    color: var(--black);
    font-size: 1rem;
    font-weight: 500;
  }
  
  .event-time {
    font-size: 0.8rem;
    color: var(--gray-dark);
  }
  
  .warning-text {
    font-size: 0.85rem;
    color: #ff6b6b;
    font-weight: 500;
    margin: var(--spacing-md) 0 0;
  }
  
  .modal-actions {
    padding: var(--spacing-lg);
    display: flex;
    gap: var(--spacing-md);
    border-top: 1px solid var(--gray);
  }
  
  .btn-secondary, .btn-danger {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .btn-secondary {
    background: var(--gray);
    color: var(--white);
  }
  
  .btn-secondary:hover {
    background: var(--gray-dark);
  }
  
  .btn-danger {
    background: #ff6b6b;
    color: var(--white);
  }
  
  .btn-danger:hover {
    background: #ff5252;
  }
  
  /* Responsive */
  @media (max-width: 480px) {
    .modal-overlay {
      padding: var(--spacing-sm);
    }
    
    .modal-actions {
      flex-direction: column-reverse;
    }
  }
</style>