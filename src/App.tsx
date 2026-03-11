import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Book, 
  Lock, 
  User, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  LogOut, 
  ShieldCheck, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface User {
  id: number;
  username: string;
  role: 'admin' | 'librarian' | 'user';
}

interface RareBook {
  id: number;
  title: string;
  author: string;
  year: number;
  condition: string;
  description: string;
  is_rare: number;
}

interface AccessRequest {
  id: number;
  user_id: number;
  book_id: number;
  username: string;
  book_title: string;
  status: 'pending' | 'approved' | 'rejected';
  request_date: string;
}

// Memoized Book Card Component
const BookCard = React.memo(({ book, user, onEdit, onDelete, onRequest }: { 
  book: RareBook, 
  user: User, 
  onEdit: (b: RareBook) => void, 
  onDelete: (id: number) => void,
  onRequest: (id: number) => void
}) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="bg-white rounded-3xl p-8 border border-[#1a1a1a]/5 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-2 h-full bg-[#1a1a1a]" />
    
    <div className="flex justify-between items-start mb-6">
      <div className="p-3 bg-[#F5F2ED] rounded-2xl">
        <Book className="w-6 h-6 text-[#1a1a1a]" />
      </div>
      <div className="flex gap-2 transition-opacity">
        {user.role !== 'user' ? (
          <>
            <button 
              onClick={() => onEdit(book)}
              className="p-2 hover:bg-[#F5F2ED] rounded-lg transition-colors"
              title="Edit Book"
            >
              <Edit className="w-4 h-4" />
            </button>
            {user.role === 'admin' && (
              <button 
                onClick={() => onDelete(book.id)}
                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                title="Delete Book"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <button 
            onClick={() => onRequest(book.id)}
            className="bg-[#1a1a1a] text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2"
          >
            <ShieldCheck className="w-3 h-3" /> Request Access
          </button>
        )}
      </div>
    </div>

    <h3 className="text-2xl font-bold mb-2 line-clamp-1">{book.title}</h3>
    <p className="text-[#1a1a1a]/60 text-sm mb-4 italic font-medium">{book.author}, {book.year}</p>
    
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40">Condition</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          book.condition === 'Excellent' ? 'bg-green-100 text-green-700' :
          book.condition === 'Good' ? 'bg-blue-100 text-blue-700' :
          'bg-orange-100 text-orange-700'
        }`}>
          {book.condition}
        </span>
      </div>
      <p className="text-sm text-[#1a1a1a]/70 line-clamp-3 leading-relaxed">
        {book.description}
      </p>
    </div>
  </motion.div>
));

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'dashboard' | 'requests'>('login');
  const [books, setBooks] = useState<RareBook[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<RareBook | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  // Optimized data fetching
  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (err) {
      console.error("Fetch books failed", err);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data = await res.json();
        if (user.role === 'user') {
          setRequests(data.filter((r: any) => r.user_id === user.id));
        } else {
          setRequests(data);
        }
      }
    } catch (err) {
      console.error("Fetch requests failed", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchBooks();
      fetchRequests();
    }
  }, [user, fetchBooks, fetchRequests]);

  // Memoized filtered books
  const filteredBooks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return books;
    return books.filter(b => 
      b.title.toLowerCase().includes(query) ||
      b.author.toLowerCase().includes(query)
    );
  }, [books, searchQuery]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setView('dashboard');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleLogout = useCallback(() => {
    setUser(null);
    setView('login');
    setLoginForm({ username: '', password: '' });
  }, []);

  const handleSaveBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bookData: any = Object.fromEntries(formData.entries());
    
    if (bookData.year) {
      bookData.year = parseInt(bookData.year as string, 10);
    }

    const method = editingBook ? 'PUT' : 'POST';
    const url = editingBook ? `/api/books/${editingBook.id}` : '/api/books';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save book');
      }

      setIsModalOpen(false);
      setEditingBook(null);
      fetchBooks();
    } catch (err: any) {
      alert(err.message || 'An error occurred while saving the book');
    }
  };

  const handleDeleteBook = useCallback(async (id: number) => {
    // Optimistic update: remove from UI immediately
    const previousBooks = [...books];
    setBooks(prev => prev.filter(b => b.id !== id));
    
    try {
      const response = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete book');
      }
      // Also refresh requests if any were deleted
      fetchRequests();
    } catch (err) {
      console.error('Delete failed:', err);
      setBooks(previousBooks); // Revert on failure
      alert('Failed to delete book. Reverting changes.');
    }
  }, [books, fetchRequests]);

  const handleRequestAccess = useCallback(async (bookId: number) => {
    if (!user) return;
    await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, book_id: bookId }),
    });
    alert('Access request submitted successfully!');
    fetchRequests();
  }, [user, fetchRequests]);

  const handleUpdateStatus = useCallback(async (requestId: number, status: string) => {
    await fetch(`/api/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchRequests();
  }, [fetchRequests]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center p-4 font-serif">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-[#1a1a1a]/10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
              <BookOpen className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-[#1a1a1a]">Rare Books Access</h1>
            <p className="text-[#1a1a1a]/60 text-sm mt-2">Library Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-[#1a1a1a]/50 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a1a1a]/30" />
                <input 
                  type="text" 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#F5F2ED]/50 border border-[#1a1a1a]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 transition-all"
                  placeholder="Enter username"
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-[#1a1a1a]/50 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a1a1a]/30" />
                <input 
                  type="password" 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#F5F2ED]/50 border border-[#1a1a1a]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 transition-all"
                  placeholder="Enter password"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button 
              type="submit"
              className="w-full bg-[#1a1a1a] text-white py-4 rounded-xl font-semibold hover:bg-[#333] transition-colors shadow-lg shadow-[#1a1a1a]/20"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 pt-6 border-top border-[#1a1a1a]/5 text-center">
            <p className="text-xs text-[#1a1a1a]/40 italic">
              "A room without books is like a body without a soul."
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] font-serif text-[#1a1a1a]">
      {/* Navigation */}
      <nav className="bg-white border-b border-[#1a1a1a]/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-none">Rare Books</h2>
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">Access Manager</span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <button 
              onClick={() => setView('dashboard')}
              className={`text-sm font-semibold transition-colors ${view === 'dashboard' ? 'text-[#1a1a1a]' : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]'}`}
            >
              Collection
            </button>
            <button 
              onClick={() => setView('requests')}
              className={`text-sm font-semibold transition-colors ${view === 'requests' ? 'text-[#1a1a1a]' : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]'}`}
            >
              {user.role === 'user' ? 'My Requests' : 'Manage Requests'}
            </button>
            <div className="h-6 w-[1px] bg-[#1a1a1a]/10" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold">{user.username}</p>
                <p className="text-[10px] uppercase tracking-wider opacity-40 font-bold">{user.role}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {view === 'dashboard' ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Rare Collection</h1>
                <p className="text-[#1a1a1a]/50 mt-1 italic">Preserving knowledge through the ages.</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a1a1a]/30" />
                  <input 
                    type="text" 
                    placeholder="Search titles or authors..."
                    className="pl-10 pr-4 py-2 bg-white border border-[#1a1a1a]/10 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/10 w-64"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                {user.role !== 'user' && (
                  <button 
                    onClick={() => { setEditingBook(null); setIsModalOpen(true); }}
                    className="bg-[#1a1a1a] text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-[#333] transition-all shadow-lg shadow-[#1a1a1a]/10"
                  >
                    <Plus className="w-4 h-4" /> Add Book
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredBooks.map((book) => (
                  <BookCard 
                    key={book.id}
                    book={book}
                    user={user}
                    onEdit={(b) => { setEditingBook(b); setIsModalOpen(true); }}
                    onDelete={handleDeleteBook}
                    onRequest={handleRequestAccess}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                {user.role === 'user' ? 'My Access Requests' : 'Manage Access Requests'}
              </h1>
              <p className="text-[#1a1a1a]/50 mt-1 italic">
                {user.role === 'user' 
                  ? 'Track the status of your requests to view rare items.' 
                  : 'Review and manage permissions for the rare collection.'}
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-[#1a1a1a]/10 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F5F2ED]/50 border-b border-[#1a1a1a]/10">
                    {user.role !== 'user' && (
                      <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40">Requester</th>
                    )}
                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40">Book Title</th>
                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40">Date</th>
                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40">Status</th>
                    {user.role !== 'user' && (
                      <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]/5">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#F5F2ED]/20 transition-colors">
                      {user.role !== 'user' && (
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#1a1a1a]/5 rounded-full flex items-center justify-center text-xs font-bold">
                              {req.username[0].toUpperCase()}
                            </div>
                            <span className="font-bold">{req.username}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-8 py-6 font-medium">{req.book_title}</td>
                      <td className="px-8 py-6 text-sm text-[#1a1a1a]/50">
                        {new Date(req.request_date).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center w-fit gap-1.5 ${
                          req.status === 'approved' ? 'bg-green-100 text-green-700' :
                          req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {req.status === 'pending' && <Clock className="w-3 h-3" />}
                          {req.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {req.status}
                        </span>
                      </td>
                      {user.role !== 'user' && (
                        <td className="px-8 py-6 text-right">
                          {req.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleUpdateStatus(req.id, 'approved')}
                                className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {requests.length === 0 && (
                <div className="py-20 text-center">
                  <Clock className="w-12 h-12 text-[#1a1a1a]/10 mx-auto mb-4" />
                  <p className="text-[#1a1a1a]/40 italic">
                    {user.role === 'user' ? "You haven't made any requests yet." : "No pending requests at the moment."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#1a1a1a]/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-[#1a1a1a]/10 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold">{editingBook ? 'Edit Rare Book' : 'Add New Rare Book'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#1a1a1a]/40 hover:text-[#1a1a1a]">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSaveBook} className="flex flex-col overflow-hidden">
                <div className="p-8 space-y-6 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40 mb-2">Book Title</label>
                      <input 
                        name="title"
                        defaultValue={editingBook?.title}
                        required
                        className="w-full px-4 py-3 bg-[#F5F2ED]/50 border border-[#1a1a1a]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/10"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40 mb-2">Author</label>
                      <input 
                        name="author"
                        defaultValue={editingBook?.author}
                        required
                        className="w-full px-4 py-3 bg-[#F5F2ED]/50 border border-[#1a1a1a]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/10"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40 mb-2">Year</label>
                      <input 
                        name="year"
                        type="number"
                        defaultValue={editingBook?.year}
                        required
                        className="w-full px-4 py-3 bg-[#F5F2ED]/50 border border-[#1a1a1a]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/10"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40 mb-2">Condition</label>
                      <select 
                        name="condition"
                        defaultValue={editingBook?.condition || 'Good'}
                        className="w-full px-4 py-3 bg-[#F5F2ED]/50 border border-[#1a1a1a]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/10"
                      >
                        <option>Excellent</option>
                        <option>Good</option>
                        <option>Fair</option>
                        <option>Fragile</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40 mb-2">Description</label>
                      <textarea 
                        name="description"
                        defaultValue={editingBook?.description}
                        required
                        rows={4}
                        className="w-full px-4 py-3 bg-[#F5F2ED]/50 border border-[#1a1a1a]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/10 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-[#1a1a1a]/10 flex justify-end gap-4 shrink-0 bg-white">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-3 rounded-xl font-bold text-sm text-[#1a1a1a]/60 hover:bg-[#F5F2ED] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-[#1a1a1a] text-white rounded-xl font-bold text-sm hover:bg-[#333] transition-colors shadow-lg shadow-[#1a1a1a]/20"
                  >
                    {editingBook ? 'Update Book' : 'Save Book'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
