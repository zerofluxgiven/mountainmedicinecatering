import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import RecipeList from './pages/Recipes/RecipeList';
import RecipeViewer from './pages/Recipes/RecipeViewer';
import RecipeEditor from './pages/Recipes/RecipeEditor';
import RecipeImport from './pages/Recipes/RecipeImport';
import EventList from './pages/Events/EventList';
import EventViewer from './pages/Events/EventViewer';
import EventEditor from './pages/Events/EventEditor';
import AllergyManager from './pages/Events/AllergyManager';
import MenuList from './pages/Menus/MenuList';
import MenuViewer from './pages/Menus/MenuViewer';
import MenuEditor from './pages/Menus/MenuEditor';
import IngredientList from './pages/Ingredients/IngredientList';
import IngredientViewer from './pages/Ingredients/IngredientViewer';
import IngredientEditor from './pages/Ingredients/IngredientEditor';
import AIChat from './pages/Chat/AIChat';

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      {/* Event Routes */}
                      <Route path="/events" element={<EventList />} />
                      <Route path="/events/new" element={<EventEditor />} />
                      <Route path="/events/:id" element={<EventViewer />} />
                      <Route path="/events/:id/edit" element={<EventEditor />} />
                      <Route path="/events/:eventId/allergies" element={<AllergyManager />} />
                      {/* Recipe Routes */}
                      <Route path="/recipes" element={<RecipeList />} />
                      <Route path="/recipes/new" element={<RecipeEditor />} />
                      <Route path="/recipes/import" element={<RecipeImport />} />
                      <Route path="/recipes/:id" element={<RecipeViewer />} />
                      <Route path="/recipes/:id/edit" element={<RecipeEditor />} />
                      {/* Menu Routes */}
                      <Route path="/menus" element={<MenuList />} />
                      <Route path="/menus/new" element={<MenuEditor />} />
                      <Route path="/menus/:id" element={<MenuViewer />} />
                      <Route path="/menus/:id/edit" element={<MenuEditor />} />
                      {/* Ingredient Routes */}
                      <Route path="/ingredients" element={<IngredientList />} />
                      <Route path="/ingredients/new" element={<IngredientEditor />} />
                      <Route path="/ingredients/:id" element={<IngredientViewer />} />
                      <Route path="/ingredients/:id/edit" element={<IngredientEditor />} />
                      {/* Other Routes */}
                      <Route path="/chat" element={<AIChat />} />
                    </Routes>
                  </Layout>
                </AppProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}