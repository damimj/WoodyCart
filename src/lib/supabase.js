import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

// Returns a Supabase client that includes x-share-id in every request.
// PostgREST RLS policies read this header via get_share_id_header() to
// authorize mutations — callers must know the list's share_id.
function scopedClient(shareId) {
  return createClient(supabaseUrl, supabasePublishableKey, {
    global: { headers: { 'x-share-id': shareId } },
  })
}

// ── Lists ──────────────────────────────────────────────────────────────────

export async function getList(shareId) {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('share_id', shareId)
    .single()
  if (error) throw error
  return data
}

export async function createList(name, icon = null) {
  const { v4: uuidv4 } = await import('uuid')
  const shareId = uuidv4()
  const { data, error } = await supabase
    .from('lists')
    .insert({ name, share_id: shareId, archived: false, icon: icon || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateList(id, updates, shareId) {
  const { error } = await scopedClient(shareId).from('lists').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteList(id, shareId) {
  const { error } = await scopedClient(shareId).from('lists').delete().eq('id', id)
  if (error) throw error
}

export async function getAllLists() {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Items ──────────────────────────────────────────────────────────────────

export async function getItems(listId) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

export async function addItem(listId, item, shareId) {
  const { data, error } = await scopedClient(shareId)
    .from('items')
    .insert({ list_id: listId, ...item })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateItem(id, updates, shareId) {
  const { error } = await scopedClient(shareId).from('items').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteItem(id, shareId) {
  const { error } = await scopedClient(shareId).from('items').delete().eq('id', id)
  if (error) throw error
}

// ── Categories ─────────────────────────────────────────────────────────────

export async function getCategories(listId) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addCategory(listId, name, color, shareId) {
  const { data, error } = await scopedClient(shareId)
    .from('categories')
    .insert({ list_id: listId, name, color })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id, shareId) {
  const { error } = await scopedClient(shareId).from('categories').delete().eq('id', id)
  if (error) throw error
}

// ── Image Upload ───────────────────────────────────────────────────────────

export async function uploadImage(file) {
  const { v4: uuidv4 } = await import('uuid')
  const ext = file.name.split('.').pop()
  const path = `items/${uuidv4()}.${ext}`
  const { error } = await supabase.storage.from('item-images').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('item-images').getPublicUrl(path)
  return data.publicUrl
}
