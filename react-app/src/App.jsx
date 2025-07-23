import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { DeezNutsProvider } from './contexts/DeezNutsContext';
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
import MenuPlanner from './pages/Menus/MenuPlanner';
import MenuPlannerWrapper from './pages/Menus/MenuPlannerWrapper';
import IngredientList from './pages/Ingredients/IngredientList';
import IngredientViewer from './pages/Ingredients/IngredientViewer';
import IngredientEditor from './pages/Ingredients/IngredientEditor';
import AIChat from './pages/Chat/AIChat';
import AIHistory from './pages/AI/AIHistory';
import Settings from './pages/Settings/Settings';
import ShoppingListList from './pages/ShoppingLists/ShoppingListList';
import ShoppingListViewer from './pages/ShoppingLists/ShoppingListViewer';
import ShoppingListEditor from './pages/ShoppingLists/ShoppingListEditor';
import IngredientCleanup from './pages/Admin/IngredientCleanup';

// Load test utilities in development
if (process.env.NODE_ENV === 'development') {
  import('./utils/exposeForTesting');
}

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
                  <DeezNutsProvider>
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
                      <Route path="/menus/new" element={<MenuPlannerWrapper />} />
                      <Route path="/menus/:id" element={<MenuViewer />} />
                      <Route path="/menus/:id/edit" element={<MenuPlannerWrapper />} />
                      <Route path="/events/:eventId/menus/new/plan" element={<MenuPlannerWrapper />} />
                      <Route path="/events/:eventId/menus/:menuId/plan" element={<MenuPlannerWrapper />} />
                      <Route path="/menus/:menuId/plan" element={<MenuPlannerWrapper />} />
                      {/* Ingredient Routes */}
                      <Route path="/ingredients" element={<IngredientList />} />
                      <Route path="/ingredients/new" element={<IngredientEditor />} />
                      <Route path="/ingredients/:id" element={<IngredientViewer />} />
                      <Route path="/ingredients/:id/edit" element={<IngredientEditor />} />
                      {/* Shopping Lists */}
                      <Route path="/shopping-lists" element={<ShoppingListList />} />
                      <Route path="/shopping-lists/new" element={<ShoppingListEditor />} />
                      <Route path="/shopping-lists/:id" element={<ShoppingListViewer />} />
                      <Route path="/shopping-lists/:id/edit" element={<ShoppingListEditor />} />
                      {/* Other Routes */}
                      <Route path="/chat" element={<AIChat />} />
                      <Route path="/ai-history" element={<AIHistory />} />
                      <Route path="/settings" element={<Settings />} />
                      {/* Admin Routes */}
                      <Route path="/admin/ingredient-cleanup" element={<IngredientCleanup />} />
                    </Routes>
                  </Layout>
                  </DeezNutsProvider>
                </AppProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}