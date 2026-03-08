document.addEventListener('DOMContentLoaded', () => {
    const modalElement = document.getElementById('partModal');
    
    // Elemento contenedor de los botones de acción
    const actionBtnsContainer = document.getElementById('actionButtonsContainer');

    // Función para verificar si hay algún registro y mostrar/ocultar botones
    function toggleActionButtons() {
        if (!actionBtnsContainer) return;
        
        // Verifica si algún '.registros-cell' tiene contenido (elementos hijos)
        const hasRecords = Array.from(document.querySelectorAll('.registros-cell')).some(cell => cell.children.length > 0);
        
        if (hasRecords) {
            actionBtnsContainer.classList.remove('d-none');
        } else {
            actionBtnsContainer.classList.add('d-none');
        }
    }

    if (modalElement) {
        const partModal = new bootstrap.Modal(modalElement);
        const modalTitle = document.getElementById('partModalLabel');
        
        const saveButton = modalElement.querySelector('button.btn-primary');
        const quantityInput = modalElement.querySelector('input[type="number"]');
        const typeSelect = modalElement.querySelector('select');
        let currentRow = null;
        let currentQtyPerBox = 0;
        
        // Variables de estado para edición
        let editingColId = null;
        let editingTd = null;
        let editingOldTotal = 0;
        
        // Get all "plus" buttons
        const buttons = document.querySelectorAll('.btn-primary[title="Agregar"]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Resetear estado de edición
                editingColId = null;
                editingTd = null;
                editingOldTotal = 0;
                
                currentRow = btn.closest('tr');
                
                // Encontrar las celdas de forma robusta usando el botón como referencia
                const buttonTd = btn.closest('td');
                const qtyBoxCell = buttonTd.previousElementSibling;
                const partNoCell = qtyBoxCell.previousElementSibling;
                
                const partNo = partNoCell.textContent.trim();
                
                // Extraer el número base de Qty/Box (algunos tienen formato como "12/16" -> tomaremos el 12)
                const qtyBoxText = qtyBoxCell.textContent.trim();
                currentQtyPerBox = parseInt(qtyBoxText.split('/')[0]) || 0;
                
                // Update modal title with part number
                modalTitle.textContent = partNo;
                
                // Reset inputs for a new entry
                quantityInput.value = '';
                typeSelect.value = '';
                
                partModal.show();
            });
        });
        
        // Handle "Guardar" logic in modal
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                if (!currentRow) return;
                
                const quantity = parseInt(quantityInput.value) || 0;
                const type = typeSelect.value;
                
                if (quantity <= 0) {
                    const Toast = Swal.mixin({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: false,
                        didOpen: (toast) => {
                            toast.onmouseenter = Swal.stopTimer;
                            toast.onmouseleave = Swal.resumeTimer;
                        }
                    });
                    Toast.fire({
                        icon: 'warning',
                        title: 'Por favor ingrese una cantidad mayor a 0.'
                    });
                    return;
                }
                
                if (!type) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Falta información',
                        text: 'Por favor seleccione un tipo de empaque.',
                        confirmButtonColor: '#0d6efd'
                    });
                    return;
                }
                
                // Calcular total
                let total = 0;
                if (type === 'piezas') {
                    total = quantity;
                } else if (type === 'pallets') {
                    total = quantity * currentQtyPerBox;
                }
                
                // Update the total cell in the UI (acumular)
                const totalCell = currentRow.querySelector('.total-cell');
                
                if (editingColId && editingTd) {
                    // MODO EDICIÓN
                    
                    // Actualizar el texto visual
                    let addedQuantityText = type === 'piezas' ? `${quantity} piezas` : `${quantity} pallet${quantity !== 1 ? 's' : ''}`;
                    editingTd.querySelector('span').textContent = addedQuantityText;
                    
                    // Actualizar datasets
                    editingTd.dataset.quantity = quantity;
                    editingTd.dataset.type = type;
                    editingTd.dataset.recordTotal = total;
                    
                    // Recalcular el total general de la fila
                    if (totalCell) {
                        let currentGlobalTotal = parseInt(totalCell.textContent) || 0;
                        let newTotal = currentGlobalTotal - editingOldTotal + total;
                        totalCell.textContent = newTotal === 0 ? '-' : newTotal;
                    }
                    
                    partModal.hide();
                    return; // Terminar aquí, no crear nueva columna
                }
                
                // MODO CREACIÓN (Nuevo Registro)
                if (totalCell) {
                    let currentTotal = parseInt(totalCell.textContent) || 0;
                    let newTotal = currentTotal + total;
                    totalCell.textContent = newTotal === 0 ? '-' : newTotal;
                }
                
                // Formatear el texto agregado
                let addedQuantityText = type === 'piezas' ? `${quantity} piezas` : `${quantity} pallet${quantity !== 1 ? 's' : ''}`;
                
                // Encontrar la celda de registros en esta fila específica
                const registrosCell = currentRow.querySelector('.registros-cell');
                if (!registrosCell) return;
                
                // Crear el bloque individual para este registro
                const recordDiv = document.createElement('div');
                recordDiv.className = 'd-flex justify-content-between align-items-center mb-1 p-1 border rounded bg-white shadow-sm';
                recordDiv.style.minWidth = '140px';
                
                // Guardar datos en el elemento para futura edición
                recordDiv.dataset.quantity = quantity;
                recordDiv.dataset.type = type;
                recordDiv.dataset.recordTotal = total;
                
                // Generar HTML con texto y botones
                recordDiv.innerHTML = `
                    <span class="fw-bold text-success small">${addedQuantityText}</span> 
                    <div class="ms-2 text-nowrap">
                        <i class="fa-solid fa-pen text-primary edit-record me-2" style="cursor: pointer; font-size: 0.85rem;" title="Editar este registro"></i>
                        <i class="fa-solid fa-trash text-danger delete-record" style="cursor: pointer; font-size: 0.85rem;" title="Eliminar este registro"></i>
                    </div>
                `;
                
                // Agregar el listener para EDITAR
                const editBtn = recordDiv.querySelector('.edit-record');
                editBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    // Configurar estado de edición
                    editingColId = 'editing'; // No longer need unique ID, just flag
                    editingTd = recordDiv;
                    // Necesitamos volver a referenciar 'currentRow' en caso de que cambie
                    currentRow = recordDiv.closest('tr');
                    editingOldTotal = parseInt(recordDiv.dataset.recordTotal) || 0;
                    
                    // Recuperar valores base de la fila
                    const btnTd = currentRow.querySelector('.btn-primary[title="Agregar"]').closest('td');
                    const rowQtyBoxCell = btnTd.previousElementSibling;
                    const rowPartNoCell = rowQtyBoxCell.previousElementSibling;
                    
                    document.getElementById('partModalLabel').textContent = rowPartNoCell.textContent.trim();
                    currentQtyPerBox = parseInt(rowQtyBoxCell.textContent.trim().split('/')[0]) || 0;
                    
                    // Llenar el modal con los valores existentes
                    quantityInput.value = recordDiv.dataset.quantity;
                    typeSelect.value = recordDiv.dataset.type;
                    
                    partModal.show();
                });

                // Agregar el listener para ELIMINAR
                const deleteBtn = recordDiv.querySelector('.delete-record');
                deleteBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    Swal.fire({
                        title: '¿Estás seguro?',
                        text: "Esta acción eliminará el registro y deducirá la cantidad del total.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#dc3545',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // Restar del total
                            const tCell = recordDiv.closest('tr').querySelector('.total-cell');
                            if (tCell) {
                                let currentGlobalTotal = parseInt(tCell.textContent) || 0;
                                let recordTotal = parseInt(recordDiv.dataset.recordTotal) || 0;
                                let newTotal = currentGlobalTotal - recordTotal;
                                tCell.textContent = newTotal === 0 ? '-' : newTotal;
                            }
                            
                            // Eliminar este bloque
                            recordDiv.remove();
                            toggleActionButtons();
                            
                            // Opcional: mostrar una pequeña confirmación de éxito
                            const Toast = Swal.mixin({
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 2000,
                                timerProgressBar: false
                            });
                            Toast.fire({
                                icon: 'success',
                                title: 'Registro eliminado'
                            });
                        }
                    });
                });
                
                // Añadir el bloque a la celda de registros de ESTA fila
                registrosCell.appendChild(recordDiv);
                toggleActionButtons();
                
                partModal.hide();
            });
        }
        
        // --- FUNCIONALIDAD DE COPIAR REPORTE AL PORTAPAPELES ---
        const copyBtn = document.getElementById('copyReportBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                
                // Función auxiliar para obtener el total basado en el número de parte exacto
                const getTotalForPart = (partNumber) => {
                    const rows = document.querySelectorAll('tbody tr');
                    for (const row of rows) {
                        const tds = row.querySelectorAll('td');
                        // En nuestra tabla, el número de parte siempre está en la misma columna 
                        // relativa al botón 'Agregar', busquémoslo así de forma segura.
                        const btnTd = row.querySelector('.btn-primary[title="Agregar"]');
                        if (btnTd) {
                            const qtyBoxCell = btnTd.closest('td').previousElementSibling;
                            const partNoCell = qtyBoxCell.previousElementSibling;
                            
                            if (partNoCell.textContent.trim() === partNumber) {
                                const totalCell = row.querySelector('.total-cell');
                                const val = totalCell ? totalCell.textContent.trim() : '-';
                                // Si es un guion (vacío) devolvemos espacio en blanco o 0 según conveniencia, 
                                // pero el usuario pide el total, pongámoslo como string vacío para replicar su formato si está vacío, o el número.
                                return val === '-' ? '' : val;
                            }
                        }
                    }
                    return ''; // Si no lo encuentra
                };

                // Construir la plantilla requerida iterando sobre los totales
                const reportText = `INVENTARIO CL4M EN MODULOS Y PLÁSTICOS

64900-GG000  ${getTotalForPart('64900-GG000')}
64900-GG010  ${getTotalForPart('64900-GG010')}
64900-GG100 ${getTotalForPart('64900-GG100')}
64900-GG110  ${getTotalForPart('64900-GG110')}
*64900-GG200* ${getTotalForPart('64900-GG200')}
 64900-GG210 ${getTotalForPart('64900-GG210')}
*64900-JF000* ${getTotalForPart('64900-JF000')}
84410-GG000 ${getTotalForPart('84410-GG000')}
84410-GG100  ${getTotalForPart('84410-GG100')}
84410-GG200   ${getTotalForPart('84410-GG200')}
84410-GG300   ${getTotalForPart('84410-GG300')}
84410-GG900  ${getTotalForPart('84410-GG900')}
86556-GG000 ${getTotalForPart('86556-GG000')}

INVENTARIO SIDE CL4M 
 
64111-GG500 ${getTotalForPart('64111-GG500')}
64121-GG500  ${getTotalForPart('64121-GG500')}


 INVENTARIO BL7M  

64101-BC000   ${getTotalForPart('64101-BC000')}
64900-BC000  ${getTotalForPart('64900-BC000')}
84410-BC100   ${getTotalForPart('84410-BC100')}
84410-BC300  ${getTotalForPart('84410-BC300')}

865y1-xv000   9
84410-xv000   5
84410-XV100   9`;

                // API de portapapeles moderno
                navigator.clipboard.writeText(reportText).then(() => {
                    const Toast = Swal.mixin({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2500,
                        timerProgressBar: true,
                        didOpen: (toast) => {
                            toast.onmouseenter = Swal.stopTimer;
                            toast.onmouseleave = Swal.resumeTimer;
                        }
                    });
                    Toast.fire({
                        icon: 'success',
                        title: '¡Reporte copiado al portapapeles!'
                    });
                }).catch(err => {
                    console.error('Error al copiar: ', err);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo copiar el reporte al portapapeles.'
                    });
                });
            });
        }
        
        // --- FUNCIONALIDAD DE LIMPIAR TODOS LOS REGISTROS ---
        const clearBtn = document.getElementById('clearRecordsBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                Swal.fire({
                    title: '¿Estás seguro?',
                    text: "Esta acción borrará todos los registros y totales ingresados.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sí, limpiar',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Limpiar celdas de registros
                        document.querySelectorAll('.registros-cell').forEach(cell => {
                            cell.innerHTML = '';
                        });
                        
                        // Limpiar celdas de totales
                        document.querySelectorAll('.total-cell').forEach(cell => {
                            cell.textContent = '-';
                        });
                        
                        toggleActionButtons();
                        
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000,
                            timerProgressBar: false
                        });
                        Toast.fire({
                            icon: 'success',
                            title: 'Registros limpiados exitosamente'
                        });
                    }
                });
            });
        }
        
        // Ejecución inicial para asegurar el estado correcto
        toggleActionButtons();
    }
});
