import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Loader2, 
  Database, 
  Search,
  Trash2,
  BookOpen,
  Stethoscope,
  Heart,
  GraduationCap,
  FlaskConical,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KnowledgeStats {
  total: number;
  byCategory: Record<string, number>;
}

interface Document {
  id: string;
  category: string;
  source: string;
  title: string;
  tokens_count: number;
  created_at: string;
}

const categories = [
  { id: 'diagnosis', name: 'Clinical Diagnosis', icon: Stethoscope, color: 'bg-blue-500' },
  { id: 'treatment', name: 'Treatment Options', icon: FlaskConical, color: 'bg-green-500' },
  { id: 'lifestyle', name: 'Lifestyle Management', icon: Heart, color: 'bg-purple-500' },
  { id: 'education', name: 'Patient Education', icon: GraduationCap, color: 'bg-orange-500' },
  { id: 'research', name: 'Research Papers', icon: BookOpen, color: 'bg-pink-500' }
];

const KnowledgeBaseAdmin = () => {
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<KnowledgeStats>({ total: 0, byCategory: {} });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadDocuments();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-base', {
        body: {},
        method: 'GET',
      });

      // Use query params approach
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge-base?action=stats`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
          },
        }
      );

      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge-base?action=list`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!content.trim() || !category || !source.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge-base?action=add`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            category,
            source,
            title: title || source,
          }),
        }
      );

      setProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      setProgress(100);
      
      toast.success(result.message);
      
      // Reset form
      setContent('');
      setSource('');
      setTitle('');
      setCategory('');
      
      // Reload data
      loadStats();
      loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge-base?action=search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 5,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge chunk?')) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge-base?action=delete`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        }
      );

      if (response.ok) {
        toast.success('Deleted successfully');
        loadStats();
        loadDocuments();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete failed');
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.icon : FileText;
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Knowledge Base Admin
          </h1>
          <p className="text-muted-foreground mt-2">
            Build HidroAlly's hyperhidrosis expertise with research from Gemini & ChatGPT
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Chunks</div>
            </CardContent>
          </Card>
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <Card key={cat.id}>
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className={`w-8 h-8 rounded-full ${cat.color} flex items-center justify-center`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{stats.byCategory[cat.id] || 0}</div>
                  <div className="text-xs text-muted-foreground truncate">{cat.name}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload Content</TabsTrigger>
            <TabsTrigger value="search">Test Search</TabsTrigger>
            <TabsTrigger value="manage">Manage Documents</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Add Knowledge Content
                </CardTitle>
                <CardDescription>
                  Paste research from Gemini Deep Research or ChatGPT. The system will automatically chunk and embed it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source Name *</Label>
                    <Input
                      id="source"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="e.g., PubMed - Smith et al. 2023"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Descriptive title for this content"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste the entire research report or article content here..."
                    className="min-h-[300px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Word count: {content.split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing content...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                <Button 
                  onClick={handleUpload} 
                  disabled={uploading || !content || !category || !source}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Add to Knowledge Base
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Example Prompts */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>💡 Example Research Prompts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="font-semibold text-sm">For Gemini Deep Research:</p>
                  <div className="bg-muted p-3 rounded text-sm italic border-l-4 border-primary">
                    "Research comprehensive treatment options for primary focal hyperhidrosis. Include clinical guidelines, FDA-approved treatments, emerging therapies, and success rates. Provide detailed information suitable for a medical AI assistant."
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="font-semibold text-sm">For ChatGPT Research:</p>
                  <div className="bg-muted p-3 rounded text-sm italic border-l-4 border-blue-500">
                    "Find and summarize the top 15 research papers on hyperhidrosis from PubMed published in the last 5 years. Include treatment efficacy data, patient outcomes, and clinical recommendations."
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Test Knowledge Search
                </CardTitle>
                <CardDescription>
                  Test how HidroAlly will find relevant knowledge for user questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ask a hyperhidrosis question..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Top {searchResults.length} Results:</h3>
                    {searchResults.map((result, idx) => (
                      <Card key={result.id} className="bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline">{result.category}</Badge>
                            <span className="text-xs text-muted-foreground">
                              Similarity: {(result.similarity * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{result.source}</p>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {result.content}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Tab */}
          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Manage Documents ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No documents yet. Add some knowledge!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {documents.map(doc => {
                      const Icon = getCategoryIcon(doc.category);
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.title || doc.source}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.category} • {doc.tokens_count} words • {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default KnowledgeBaseAdmin;
