<!-- src/routes/stats/+page.svelte -->
<script>
    import { onMount } from 'svelte'
    import { goto } from '$app/navigation'
    import { base } from '$app/paths'
    import { supabase } from '$lib/supabase'
    import { family, subjects } from '$lib/stores/family'
    
    let sleepData = []
    let bottleData = []
    let growthData = []
    let currentWeekStart = new Date()
    let loading = true
    let viewMode = 'chart' // 'chart' o 'table'
    
    // Variables para zoom y navegación táctil
    let chartScale = 1
    let chartOffsetX = 0
    let isDragging = false
    let dragStartX = 0
    let dragStartOffsetX = 0
    let activeTooltip = null
    let tooltipX = 0
    let tooltipY = 0
    
    // Configurar el inicio de la semana (lunes)
    function getWeekStart(date) {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para que lunes sea día 1
        return new Date(d.setDate(diff))
    }
    
    // Formatear fecha para mostrar
    function formatWeekRange(weekStart) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        const options = { day: 'numeric', month: 'short' }
        return `${weekStart.toLocaleDateString('es-ES', options)} - ${weekEnd.toLocaleDateString('es-ES', options)}`
    }
    
    // Calcular horas de sueño por día
    async function calculateSleepHours(weekStart) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)
        
        const { data: events, error } = await supabase
            .from('events')
            .select('*, subjects(*)')
            .gte('event_timestamp', weekStart.toISOString())
            .lt('event_timestamp', weekEnd.toISOString())
            .order('event_timestamp')
        
        if (error) {
            console.error('Error loading events:', error)
            return {}
        }
        
        const sleepEvents = events.filter(event => 
            event.action_name.toLowerCase().includes('dorm') || 
            event.action_name.toLowerCase().includes('despiert')
        )
        
        const dailySleep = {}
        let sleepStart = null
        
        // Inicializar días de la semana
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart)
            day.setDate(weekStart.getDate() + i)
            const dayKey = day.toISOString().split('T')[0]
            dailySleep[dayKey] = 0
        }
        
        sleepEvents.forEach(event => {
            const isGoingToSleep = event.action_name.toLowerCase().includes('dorm')
            const eventDate = new Date(event.event_timestamp)
            const dayKey = eventDate.toISOString().split('T')[0]
            
            if (isGoingToSleep) {
                sleepStart = eventDate
            } else if (sleepStart && !isGoingToSleep) {
                // Se despierta
                const sleepDuration = (eventDate - sleepStart) / (1000 * 60 * 60) // horas
                if (sleepDuration > 0 && sleepDuration < 24) { // Validar duración razonable
                    dailySleep[dayKey] += sleepDuration
                }
                sleepStart = null
            }
        })
        
        return dailySleep
    }
    
    // Calcular mililitros de biberón por día
    async function calculateBottleVolume(weekStart) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999) // Incluir todo el último día
        
        const { data: events, error } = await supabase
            .from('events')
            .select('*, subjects(*)')
            .gte('event_timestamp', weekStart.toISOString())
            .lte('event_timestamp', weekEnd.toISOString())
            .order('event_timestamp')
        
        if (error) {
            console.error('Error loading events:', error)
            return {}
        }
        
        console.log('Total events loaded:', events.length)
        console.log('Week range:', weekStart.toISOString(), 'to', weekEnd.toISOString())
        
        // Debug: mostrar todos los eventos para verificar nombres
        events.forEach(event => {
            console.log('Event:', event.action_name, 'Date:', event.event_timestamp)
        })
        
        const bottleEvents = events.filter(event => 
            event.action_name.toLowerCase().includes('biber') ||
            event.action_name.toLowerCase().includes('bibi') ||
            event.action_name.toLowerCase().includes('botella')
        )
        
        console.log('Bottle events found:', bottleEvents.length)
        bottleEvents.forEach(event => {
            console.log('Bottle event:', event.action_name)
        })
        
        const dailyBottle = {}
        
        // Inicializar días de la semana
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart)
            day.setDate(weekStart.getDate() + i)
            const dayKey = day.toISOString().split('T')[0]
            dailyBottle[dayKey] = 0
        }
        
        bottleEvents.forEach(event => {
            // Extraer cantidad de los paréntesis
            const match = event.action_name.match(/\((\d+)ml\)/)
            console.log('Checking event:', event.action_name, 'Match:', match)
            if (match) {
                const volume = parseInt(match[1])
                const eventDate = new Date(event.event_timestamp)
                const dayKey = eventDate.toISOString().split('T')[0]
                console.log('Adding', volume, 'ml to day', dayKey)
                dailyBottle[dayKey] += volume
            }
        })
        
        console.log('Daily bottle totals:', dailyBottle)
        
        return dailyBottle
    }
    
    // Cargar datos de crecimiento (peso y estatura) - historial completo
    async function loadGrowthData() {
        try {
            const { data: events, error } = await supabase
                .from('events')
                .select('action_name, event_timestamp, subjects(name)')
                .or('action_name.ilike.%peso%,action_name.ilike.%estatura%')
                .order('event_timestamp', { ascending: true })
            
            if (error) {
                console.error('Error loading growth data:', error)
                return
            }
            
            // Procesar eventos para extraer datos
            const growthMap = new Map()
            
            events.forEach(event => {
                const date = new Date(event.event_timestamp).toISOString().split('T')[0] // YYYY-MM-DD
                const dateObj = new Date(event.event_timestamp)
                const formattedDate = dateObj.toLocaleDateString('es-ES')
                
                if (!growthMap.has(date)) {
                    growthMap.set(date, {
                        date: date,
                        formattedDate: formattedDate,
                        weight: null,
                        height: null,
                        timestamp: dateObj
                    })
                }
                
                const entry = growthMap.get(date)
                
                // Extraer peso
                if (event.action_name.toLowerCase().includes('peso')) {
                    const weightMatch = event.action_name.match(/\(([0-9]+\.?[0-9]*)kg\)/)
                    if (weightMatch) {
                        entry.weight = parseFloat(weightMatch[1])
                    }
                }
                
                // Extraer estatura
                if (event.action_name.toLowerCase().includes('estatura')) {
                    const heightMatch = event.action_name.match(/\(([0-9]+\.?[0-9]*)m\)/)
                    if (heightMatch) {
                        entry.height = parseFloat(heightMatch[1]) * 100 // Convertir a cm
                    }
                }
            })
            
            // Convertir a array y ordenar por fecha (más reciente primero para tabla)
            growthData = Array.from(growthMap.values())
                .filter(entry => entry.weight !== null || entry.height !== null)
                .sort((a, b) => b.timestamp - a.timestamp) // Orden inverso para tabla
                
            console.log('Growth data loaded:', growthData)
            
        } catch (error) {
            console.error('Error loading growth data:', error)
        }
    }
    
    // Cargar datos de la semana
    async function loadWeekData() {
        loading = true
        const weekStart = getWeekStart(currentWeekStart)
        
        const [sleepHours, bottleVolume] = await Promise.all([
            calculateSleepHours(weekStart),
            calculateBottleVolume(weekStart),
            loadGrowthData()
        ])
        
        // Convertir a arrays para los gráficos
        sleepData = Object.entries(sleepHours).map(([date, hours]) => ({
            date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
            value: Math.round(hours * 10) / 10 // Redondear a 1 decimal
        }))
        
        bottleData = Object.entries(bottleVolume).map(([date, ml]) => ({
            date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
            value: ml
        }))
        
        loading = false
    }
    
    // Navegar semanas
    function previousWeek() {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7)
        currentWeekStart = new Date(currentWeekStart)
        loadWeekData()
    }
    
    function nextWeek() {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7)
        currentWeekStart = new Date(currentWeekStart)
        loadWeekData()
    }
    
    // Alternar entre vista de gráfico y tabla
    function toggleViewMode() {
        viewMode = viewMode === 'chart' ? 'table' : 'chart'
        // Reset zoom cuando cambiamos de vista
        resetChartZoom()
    }
    
    // Funciones para zoom y navegación táctil
    function resetChartZoom() {
        chartScale = 1
        chartOffsetX = 0
        activeTooltip = null
    }
    
    function handleTouchStart(event, chartData, chartType) {
        if (event.touches.length === 1) {
            isDragging = true
            dragStartX = event.touches[0].clientX
            dragStartOffsetX = chartOffsetX
            
            // Mostrar tooltip en el punto tocado
            const rect = event.target.getBoundingClientRect()
            const x = event.touches[0].clientX - rect.left
            const scaledX = (x - chartOffsetX) / chartScale
            const dataIndex = Math.round((scaledX - 25) / (750 / Math.max(chartData.length - 1, 1)))
            
            if (dataIndex >= 0 && dataIndex < chartData.length) {
                showTooltip(chartData[dataIndex], x, event.touches[0].clientY - rect.top, chartType)
            }
        } else if (event.touches.length === 2) {
            // Zoom con dos dedos
            const touch1 = event.touches[0]
            const touch2 = event.touches[1]
            const distance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) + 
                Math.pow(touch2.clientY - touch1.clientY, 2)
            )
            
            if (!isDragging) {
                isDragging = true
                dragStartX = distance
            }
        }
        event.preventDefault()
    }
    
    function handleTouchMove(event, chartData, chartType) {
        if (!isDragging) return
        
        if (event.touches.length === 1) {
            // Arrastrar para navegar
            const deltaX = event.touches[0].clientX - dragStartX
            chartOffsetX = Math.max(Math.min(dragStartOffsetX + deltaX, 100), -200 * chartScale)
            
            // Actualizar tooltip
            const rect = event.target.getBoundingClientRect()
            const x = event.touches[0].clientX - rect.left
            const scaledX = (x - chartOffsetX) / chartScale
            const dataIndex = Math.round((scaledX - 25) / (750 / Math.max(chartData.length - 1, 1)))
            
            if (dataIndex >= 0 && dataIndex < chartData.length) {
                showTooltip(chartData[dataIndex], x, event.touches[0].clientY - rect.top, chartType)
            }
        } else if (event.touches.length === 2) {
            // Zoom con pellizco
            const touch1 = event.touches[0]
            const touch2 = event.touches[1]
            const distance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) + 
                Math.pow(touch2.clientY - touch1.clientY, 2)
            )
            
            const scale = distance / dragStartX
            chartScale = Math.max(Math.min(chartScale * scale, 3), 0.5)
            dragStartX = distance
        }
        event.preventDefault()
    }
    
    function handleTouchEnd(event) {
        isDragging = false
        // Mantener tooltip visible por un momento después del toque
        setTimeout(() => {
            if (!isDragging) {
                activeTooltip = null
            }
        }, 2000)
        event.preventDefault()
    }
    
    function showTooltip(dataPoint, x, y, chartType) {
        activeTooltip = {
            data: dataPoint,
            x: x,
            y: y - 50,
            type: chartType
        }
    }
    
    onMount(() => {
        currentWeekStart = getWeekStart(new Date())
        loadWeekData()
    })
</script>

<div class="container">
    <header>
        <button class="back-button" on:click={() => goto(`${base}/dashboard`)}>
            <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h1>Estadísticas</h1>
    </header>

    <main>
        {#if loading}
            <div class="loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Cargando estadísticas...</p>
            </div>
        {:else}
            <!-- Navegación de semana -->
            <div class="week-navigation">
                <button class="nav-button" on:click={previousWeek}>
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="week-range">{formatWeekRange(getWeekStart(currentWeekStart))}</span>
                <button class="nav-button" on:click={nextWeek}>
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>

            <!-- Sección de crecimiento (Peso y Estatura) -->
            <div class="growth-section">
                <div class="section-header">
                    <h2>Crecimiento (Peso y Estatura)</h2>
                    <div class="header-buttons">
                        {#if viewMode === 'chart' && (chartScale !== 1 || chartOffsetX !== 0)}
                            <button class="reset-zoom-button" on:click={resetChartZoom} title="Resetear zoom">
                                <i class="fa-solid fa-expand"></i>
                            </button>
                        {/if}
                        <button class="toggle-button" on:click={toggleViewMode}>
                            <i class="fa-solid {viewMode === 'chart' ? 'fa-table' : 'fa-chart-line'}"></i>
                            {viewMode === 'chart' ? 'Ver Tabla' : 'Ver Gráfico'}
                        </button>
                    </div>
                </div>
                
                {#if growthData.length === 0}
                    <div class="no-data">
                        <i class="fa-solid fa-info-circle"></i>
                        <p>No hay datos de peso o estatura registrados</p>
                    </div>
                {:else}
                    {#if viewMode === 'chart'}
                        <!-- Instrucciones de uso -->
                        <div class="chart-instructions">
                            <p><i class="fa-solid fa-hand-pointer"></i> Toca y arrastra para navegar • <i class="fa-solid fa-magnifying-glass-plus"></i> Pellizca para hacer zoom</p>
                        </div>
                        
                        <!-- Vista de gráficos separados -->
                        <div class="dual-charts">
                            <!-- Gráfico de Peso -->
                            {#if growthData.filter(entry => entry.weight !== null).length > 0}
                                {@const weightData = growthData.filter(entry => entry.weight !== null).sort((a, b) => a.timestamp - b.timestamp)}
                                {@const minWeight = Math.min(...weightData.map(p => p.weight))}
                                {@const maxWeight = Math.max(...weightData.map(p => p.weight))}
                                {@const weightRange = maxWeight - minWeight || 1}
                                <div class="chart-section">
                                    <h3>Evolución del Peso</h3>
                                    <div class="chart-container">
                                        <div class="chart-wrapper">
                                            <svg 
                                                class="line-chart touch-chart" 
                                                viewBox="0 0 800 350"
                                                style="transform: scale({chartScale}) translateX({chartOffsetX}px);"
                                                on:touchstart={(e) => handleTouchStart(e, weightData, 'weight')}
                                                on:touchmove={(e) => handleTouchMove(e, weightData, 'weight')}
                                                on:touchend={handleTouchEnd}
                                            >
                                                <!-- Grid background -->
                                                <defs>
                                                    <pattern id="weight-grid" width="40" height="15" patternUnits="userSpaceOnUse">
                                                        <path d="M 40 0 L 0 0 0 15" fill="none" stroke="#f0f0f0" stroke-width="1"/>
                                                    </pattern>
                                                </defs>
                                                <rect width="800" height="350" fill="url(#weight-grid)" />
                                                
                                                <!-- Weight line -->
                                                {#if weightData.length > 1}
                                                    {#each weightData as point, i}
                                                        {#if i < weightData.length - 1}
                                                            {@const nextPoint = weightData[i + 1]}
                                                            <line
                                                                x1={(i / (weightData.length - 1)) * 750 + 25}
                                                                y1={280 - ((point.weight - minWeight) / weightRange) * 200}
                                                                x2={((i + 1) / (weightData.length - 1)) * 750 + 25}
                                                                y2={280 - ((nextPoint.weight - minWeight) / weightRange) * 200}
                                                                stroke="#ff6b6b"
                                                                stroke-width="4"
                                                            />
                                                        {/if}
                                                    {/each}
                                                {/if}
                                                
                                                <!-- Weight points -->
                                                {#each weightData as point, i}
                                                    <circle
                                                        cx={(i / Math.max(weightData.length - 1, 1)) * 750 + 25}
                                                        cy={280 - ((point.weight - minWeight) / weightRange) * 200}
                                                        r="8"
                                                        fill="#ff6b6b"
                                                        stroke="#fff"
                                                        stroke-width="3"
                                                    />
                                                    <!-- Value labels - larger for mobile -->
                                                    <text
                                                        x={(i / Math.max(weightData.length - 1, 1)) * 750 + 25}
                                                        y={280 - ((point.weight - minWeight) / weightRange) * 200 - 20}
                                                        text-anchor="middle"
                                                        fill="#444"
                                                        font-size="16"
                                                        font-weight="bold"
                                                        class="chart-label"
                                                    >
                                                        {point.weight.toFixed(2)}kg
                                                    </text>
                                                    <!-- Date labels for key points -->
                                                    {#if i % Math.max(1, Math.floor(weightData.length / 4)) === 0 || i === weightData.length - 1}
                                                        <text
                                                            x={(i / Math.max(weightData.length - 1, 1)) * 750 + 25}
                                                            y={320}
                                                            text-anchor="middle"
                                                            fill="#666"
                                                            font-size="14"
                                                            font-weight="normal"
                                                            class="date-label"
                                                        >
                                                            {new Date(point.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                        </text>
                                                    {/if}
                                                {/each}
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            {/if}
                            
                            <!-- Gráfico de Estatura -->
                            {#if growthData.filter(entry => entry.height !== null).length > 0}
                                {@const heightData = growthData.filter(entry => entry.height !== null).sort((a, b) => a.timestamp - b.timestamp)}
                                {@const minHeight = Math.min(...heightData.map(p => p.height))}
                                {@const maxHeight = Math.max(...heightData.map(p => p.height))}
                                {@const heightRange = maxHeight - minHeight || 1}
                                <div class="chart-section">
                                    <h3>Evolución de la Estatura</h3>
                                    <div class="chart-container">
                                        <div class="chart-wrapper">
                                            <svg 
                                                class="line-chart touch-chart" 
                                                viewBox="0 0 800 350"
                                                style="transform: scale({chartScale}) translateX({chartOffsetX}px);"
                                                on:touchstart={(e) => handleTouchStart(e, heightData, 'height')}
                                                on:touchmove={(e) => handleTouchMove(e, heightData, 'height')}
                                                on:touchend={handleTouchEnd}
                                            >
                                                <!-- Grid background -->
                                                <defs>
                                                    <pattern id="height-grid" width="40" height="15" patternUnits="userSpaceOnUse">
                                                        <path d="M 40 0 L 0 0 0 15" fill="none" stroke="#f0f0f0" stroke-width="1"/>
                                                    </pattern>
                                                </defs>
                                                <rect width="800" height="350" fill="url(#height-grid)" />
                                                
                                                <!-- Height line -->
                                                {#if heightData.length > 1}
                                                    {#each heightData as point, i}
                                                        {#if i < heightData.length - 1}
                                                            {@const nextPoint = heightData[i + 1]}
                                                            <line
                                                                x1={(i / (heightData.length - 1)) * 750 + 25}
                                                                y1={280 - ((point.height - minHeight) / heightRange) * 200}
                                                                x2={((i + 1) / (heightData.length - 1)) * 750 + 25}
                                                                y2={280 - ((nextPoint.height - minHeight) / heightRange) * 200}
                                                                stroke="#4ecdc4"
                                                                stroke-width="4"
                                                            />
                                                        {/if}
                                                    {/each}
                                                {/if}
                                                
                                                <!-- Height points -->
                                                {#each heightData as point, i}
                                                    <circle
                                                        cx={(i / Math.max(heightData.length - 1, 1)) * 750 + 25}
                                                        cy={280 - ((point.height - minHeight) / heightRange) * 200}
                                                        r="8"
                                                        fill="#4ecdc4"
                                                        stroke="#fff"
                                                        stroke-width="3"
                                                    />
                                                    <!-- Value labels - larger for mobile -->
                                                    <text
                                                        x={(i / Math.max(heightData.length - 1, 1)) * 750 + 25}
                                                        y={280 - ((point.height - minHeight) / heightRange) * 200 - 20}
                                                        text-anchor="middle"
                                                        fill="#444"
                                                        font-size="16"
                                                        font-weight="bold"
                                                        class="chart-label"
                                                    >
                                                        {point.height.toFixed(2)}cm
                                                    </text>
                                                    <!-- Date labels for key points -->
                                                    {#if i % Math.max(1, Math.floor(heightData.length / 4)) === 0 || i === heightData.length - 1}
                                                        <text
                                                            x={(i / Math.max(heightData.length - 1, 1)) * 750 + 25}
                                                            y={320}
                                                            text-anchor="middle"
                                                            fill="#666"
                                                            font-size="14"
                                                            font-weight="normal"
                                                            class="date-label"
                                                        >
                                                            {new Date(point.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                        </text>
                                                    {/if}
                                                {/each}
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                        
                        <!-- Tooltip interactivo -->
                        {#if activeTooltip}
                            <div 
                                class="chart-tooltip"
                                style="left: {activeTooltip.x}px; top: {activeTooltip.y}px;"
                            >
                                <div class="tooltip-content">
                                    <div class="tooltip-date">
                                        {activeTooltip.data.formattedDate}
                                    </div>
                                    <div class="tooltip-value {activeTooltip.type}">
                                        {#if activeTooltip.type === 'weight'}
                                            {activeTooltip.data.weight?.toFixed(2)} kg
                                        {:else}
                                            {activeTooltip.data.height?.toFixed(2)} cm
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {:else}
                        <!-- Vista de tabla -->
                        <div class="growth-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Peso</th>
                                        <th>Estatura</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each growthData as entry}
                                        <tr>
                                            <td>{entry.formattedDate}</td>
                                            <td>{entry.weight ? `${entry.weight.toFixed(2)} kg` : '-'}</td>
                                            <td>{entry.height ? `${entry.height.toFixed(2)} cm` : '-'}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                {/if}
            </div>

            <!-- Gráfico de sueño - OCULTO TEMPORALMENTE -->
            <!-- <div class="chart-section">
                <h2>Horas de sueño por día</h2>
                <div class="chart">
                    {#each sleepData as day}
                        <div class="bar-container">
                            <div class="bar sleep-bar" style="height: {(day.value / 12) * 100}%"></div>
                            <span class="bar-value">{day.value}h</span>
                            <span class="bar-label">{day.date}</span>
                        </div>
                    {/each}
                </div>
            </div> -->

            <!-- Gráfico de biberón -->
            <div class="chart-section">
                <h2>Mililitros de biberón por día</h2>
                <div class="chart">
                    {#each bottleData as day}
                        <div class="bar-container">
                            <div class="bar bottle-bar" style="height: {(day.value / 800) * 100}%"></div>
                            <span class="bar-value">{day.value}ml</span>
                            <span class="bar-label">{day.date}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </main>
</div>

<style>
    .container {
        min-height: 100vh;
        background-color: var(--gray-light);
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    header {
        background-color: var(--primary);
        color: var(--white);
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        box-shadow: var(--shadow-md);
    }

    .back-button {
        background: none;
        border: none;
        color: var(--white);
        font-size: 1.25rem;
        cursor: pointer;
        padding: var(--spacing-sm);
    }

    h1 {
        margin: 0;
        font-size: 1.5rem;
    }

    main {
        padding: var(--spacing-md);
        flex: 1;
    }

    .loading {
        text-align: center;
        padding: var(--spacing-xl);
        color: var(--gray-dark);
    }

    .loading i {
        font-size: 2rem;
        margin-bottom: var(--spacing-md);
        color: var(--primary);
    }

    .week-navigation {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
        background: var(--white);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
    }

    .nav-button {
        background: var(--primary);
        color: var(--white);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .nav-button:hover {
        background: var(--primary-dark);
        transform: scale(1.05);
    }

    .week-range {
        font-weight: 600;
        font-size: 1.1rem;
        color: var(--dark);
        min-width: 150px;
        text-align: center;
    }

    .chart-section {
        background: var(--white);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
        box-shadow: var(--shadow-sm);
    }

    .chart-section h2 {
        margin: 0 0 var(--spacing-lg) 0;
        color: var(--dark);
        font-size: 1.25rem;
        text-align: center;
    }

    .chart {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        height: 200px;
        gap: var(--spacing-xs);
        padding: var(--spacing-md) 0;
        border-bottom: 2px solid var(--light);
        position: relative;
    }

    .bar-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        height: 100%;
        position: relative;
    }

    .bar {
        width: 100%;
        max-width: 40px;
        min-height: 5px;
        border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        transition: all 0.3s ease;
        margin-bottom: auto;
    }


    .bottle-bar {
        background: linear-gradient(to top, #2196F3, #42A5F5);
    }

    .bar:hover {
        transform: scaleY(1.05);
        box-shadow: var(--shadow-md);
    }

    .bar-value {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--dark);
        margin-top: var(--spacing-xs);
        white-space: nowrap;
    }

    .bar-label {
        font-size: 0.7rem;
        color: var(--gray-dark);
        margin-top: var(--spacing-xs);
        text-align: center;
    }

    /* Responsive */
    @media (max-width: 640px) {
        .chart {
            gap: 2px;
        }

        .bar {
            max-width: 30px;
        }

        .bar-value {
            font-size: 0.7rem;
        }

        .bar-label {
            font-size: 0.6rem;
        }

        .week-range {
            font-size: 1rem;
            min-width: 120px;
        }
    }

    /* Estilos para sección de crecimiento */
    .growth-section {
        background: var(--white);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
        box-shadow: var(--shadow-sm);
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-lg);
    }

    .section-header h2 {
        margin: 0;
        color: var(--dark);
        font-size: 1.25rem;
    }

    .header-buttons {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }

    .toggle-button {
        background: var(--primary);
        color: var(--white);
        border: none;
        border-radius: var(--radius-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        transition: all 0.2s ease;
    }

    .toggle-button:hover {
        background: var(--primary-dark);
        transform: translateY(-1px);
    }

    .reset-zoom-button {
        background: var(--gray);
        color: var(--dark);
        border: none;
        border-radius: var(--radius-sm);
        padding: var(--spacing-sm);
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        width: 36px;
        height: 36px;
    }

    .reset-zoom-button:hover {
        background: var(--gray-dark);
        transform: translateY(-1px);
    }

    .no-data {
        text-align: center;
        padding: var(--spacing-xl);
        color: var(--gray-dark);
    }

    .no-data i {
        font-size: 2rem;
        margin-bottom: var(--spacing-md);
        color: var(--gray);
    }

    /* Estilos para gráficos duales */
    .dual-charts {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xl);
    }

    .dual-charts .chart-section {
        background: var(--background);
        border-radius: var(--radius-sm);
        padding: var(--spacing-lg);
        border: 1px solid var(--light);
    }

    .dual-charts .chart-section h3 {
        margin: 0 0 var(--spacing-md) 0;
        color: var(--dark);
        font-size: 1.1rem;
        text-align: center;
        font-weight: 600;
    }

    .chart-instructions {
        background: var(--background);
        border: 1px solid var(--light);
        border-radius: var(--radius-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        margin-bottom: var(--spacing-md);
        text-align: center;
    }

    .chart-instructions p {
        margin: 0;
        font-size: 0.85rem;
        color: var(--gray-dark);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs);
    }

    .chart-instructions i {
        color: var(--primary);
    }

    .chart-container {
        position: relative;
        overflow: hidden;
    }

    .chart-wrapper {
        width: 100%;
        height: 350px;
        position: relative;
        overflow: hidden;
        border-radius: var(--radius-sm);
        border: 1px solid var(--light);
        background: var(--white);
    }

    .line-chart {
        width: 100%;
        height: 100%;
        background: var(--white);
        touch-action: none;
        user-select: none;
    }

    .touch-chart {
        cursor: grab;
        transition: transform 0.1s ease-out;
    }

    .touch-chart:active {
        cursor: grabbing;
    }

    /* Estilos para etiquetas del gráfico */
    .chart-label {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        pointer-events: none;
    }

    .date-label {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        pointer-events: none;
    }

    /* Tooltip interactivo */
    .chart-tooltip {
        position: absolute;
        z-index: 1000;
        pointer-events: none;
        transform: translate(-50%, -100%);
    }

    .tooltip-content {
        background: var(--dark);
        color: var(--white);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--radius-sm);
        box-shadow: var(--shadow-lg);
        font-size: 0.9rem;
        text-align: center;
        min-width: 120px;
    }

    .tooltip-date {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-bottom: var(--spacing-xs);
    }

    .tooltip-value {
        font-weight: bold;
        font-size: 1.1rem;
    }

    .tooltip-value.weight {
        color: #ff6b6b;
    }

    .tooltip-value.height {
        color: #4ecdc4;
    }


    /* Estilos para tabla */
    .growth-table {
        overflow-x: auto;
    }

    .growth-table table {
        width: 100%;
        border-collapse: collapse;
        background: var(--white);
        border-radius: var(--radius-sm);
        overflow: hidden;
    }

    .growth-table th,
    .growth-table td {
        padding: var(--spacing-md);
        text-align: left;
        border-bottom: 1px solid var(--light);
    }

    .growth-table th {
        background: var(--background);
        font-weight: 600;
        color: var(--dark);
        position: sticky;
        top: 0;
    }

    .growth-table tr:nth-child(even) {
        background: var(--background);
    }

    .growth-table tr:hover {
        background: var(--primary)11;
    }

    .growth-table td {
        font-size: 0.95rem;
        color: var(--dark);
    }

    /* Responsive para sección de crecimiento */
    @media (max-width: 640px) {
        .section-header {
            flex-direction: column;
            gap: var(--spacing-md);
            align-items: stretch;
        }
        
        .toggle-button {
            justify-content: center;
        }
        
        
        .growth-table {
            font-size: 0.85rem;
        }
        
        .growth-table th,
        .growth-table td {
            padding: var(--spacing-sm);
        }
        
        .dual-charts .chart-section {
            padding: var(--spacing-md);
        }
        
        .dual-charts .chart-section h3 {
            font-size: 1rem;
        }
        
        .chart-wrapper {
            height: 300px;
        }
        
        .chart-label {
            font-size: 14px !important;
        }
        
        .date-label {
            font-size: 12px !important;
        }
        
        .tooltip-content {
            font-size: 0.8rem;
            padding: var(--spacing-xs) var(--spacing-sm);
            min-width: 100px;
        }
        
        .tooltip-value {
            font-size: 1rem;
        }
        
        .chart-instructions p {
            font-size: 0.8rem;
            flex-direction: column;
            gap: var(--spacing-xs);
            line-height: 1.4;
        }
        
        .header-buttons {
            flex-direction: column;
            gap: var(--spacing-xs);
        }
    }
</style>