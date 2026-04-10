// src/components/ItemList.jsx
import React, { useState } from 'react';
import useItems from '../hooks/useItems';

// Componente de ejemplo que muestra la lista de productos
const ItemList = ({ tableName, title }) => {
  // Usamos el hook con el nombre de la tabla pasado por props
  const { items, loading, error, addItem, deleteItem } = useItems(tableName);
  
  const [newItemForm, setNewItemForm] = useState({ name: '', description: '', price: 0 });

  // Manejador para enviar el formulario de nuevo ítem
  const handleAddItem = async (e) => {
    e.preventDefault();
    const success = await addItem({
        name: newItemForm.name,
        description: newItemForm.description,
        price: parseFloat(newItemForm.price),
    });
    
    if (success) {
        setNewItemForm({ name: '', description: '', price: 0 }); // Limpiar formulario
    }
  };

  if (loading) return <div>Cargando lista de {title}...</div>;
  if (error) return <div style={{ color: 'red' }}>Error al cargar: {error}</div>;

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>{title} ({items.length} ítems)</h2>

      {/* FORMULARIO DE AÑADIR */}
      <form onSubmit={handleAddItem} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input 
            value={newItemForm.name} 
            onChange={(e) => setNewItemForm({...newItemForm, name: e.target.value})} 
            placeholder="Nombre" 
            required
        />
        <input 
            value={newItemForm.description} 
            onChange={(e) => setNewItemForm({...newItemForm, description: e.target.value})} 
            placeholder="Descripción" 
            required
        />
        <input 
            type="number" 
            value={newItemForm.price} 
            onChange={(e) => setNewItemForm({...newItemForm, price: e.target.value})} 
            placeholder="Precio" 
            required 
        />
        <button type="submit">Agregar Ítem</button>
      </form>

      {/* LISTA DE ÍTEMS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.length === 0 ? (
            <p>No hay ítems registrados en esta sección.</p>
        ) : (
            items.map(item => (
                <div key={item.id} style={{ border: '1px dashed #eee', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <strong>{item.name}</strong> - {item.description || 'Sin descripción'} 
                        <small> (${item.price || 'N/A'})</small>
                    </div>
                    <button onClick={() => alert(`Editando ${item.id}`)}>Editar</button>
                    <button onClick={() => { 
                        if(window.confirm("¿Estás seguro de borrar este ítem?")) {
                            // Lógica de borrado real iría aquí
                            console.log(`Item ${item.id} borrado`);
                        }
                    }}>Borrar</button>
                </div>
            ))}
        </div>
    `;
}

// EJEMPLO DE USO EN EL COMPONENTE PRINCIPAL (App.js)
/* 
function App() {
  return (
    <div>
      <h1>Gestión de Productos</h1>
      <ProductManager /> // Usar el componente
    </div>
  );
}
*/
