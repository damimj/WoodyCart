// src/hooks/useItems.js
import { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

/**
 * Hook personalizado para manejar la obtención, creación y eliminación de ítems.
 * @param {string} tableName - El nombre de la tabla a manipular (ej: 'products').
 */
const useItems = (tableName) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para obtener todos los ítems de la tabla
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }
      
      setItems(data || []);
    } catch (e) {
      console.error("Error al obtener los ítems:", e);
      setError(e.message || "No fue posible cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  
  // Función para añadir un nuevo ítem
  const addItem = async (itemData) => {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .insert([itemData]);

        if (error) throw error;
        
        // Actualizar el estado local con el nuevo ítem sin recargar toda la lista
        const newItem = data[0];
        setItems(prevItems => [...prevItems, newItem]);
        return true;
    } catch (e) {
        console.error("Error al añadir ítem:", e);
        return false;
    }
  };

  // Función para eliminar un ítem por su ID
  const deleteItem = async (itemId) => {
    const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemId);

    if (error) {
        throw error;
    }
    
    // Actualizar el estado local quitando el ítem
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    return true;
  };


  return { 
    items, 
    loading, 
    error, 
    fetchItems, 
    addItem, 
    deleteItem 
  };
};

export default useItems;
