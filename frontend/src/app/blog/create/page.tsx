'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { blogService } from '@/services/blog.service';
import { categoryService } from '@/services/category.service';
import { CategoryEntity } from '@/types/category.types';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import AuthGuard from '@/components/auth/AuthGuard';
import toast from 'react-hot-toast';
import { Bold, Italic, Heading1, Heading2, List, Quote, Code, Image as ImageIcon, Link as LinkIcon, AlignCenter, AlignLeft, AlignRight } from 'lucide-react';

function BlogEditorContent() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string | undefined;
  const isEditing = !!slug;

  const [title, setTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [description, setDescription] = useState('');
  const [timeForStudy, setTimeForStudy] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [categories, setCategories] = useState<CategoryEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [blogId, setBlogId] = useState<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'محتوای مقاله را بنویسید...' }),
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
  });

  useEffect(() => {
    categoryService.list(1, 100).then((data) => setCategories(data.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEditing) {
      blogService.getBySlug(slug).then((data) => {
        const blog = data.blog;
        setTitle(blog.title);
        setCustomSlug(blog.slug);
        setDescription(blog.description);
        setTimeForStudy(blog.time_for_study);
        setBlogId(blog.id);
        if (editor && blog.content) {
          editor.commands.setContent(blog.content);
        }
        if (blog.categories) {
          setSelectedCategories(
            blog.categories.map((c) => c.category?.title || '').filter(Boolean)
          );
        }
      }).catch(() => {
        toast.error('خطا در بارگذاری مقاله');
        router.push('/blog/my');
      });
    }
  }, [isEditing, slug, editor, router]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('عنوان مقاله را وارد کنید');
      return;
    }
    if (!description.trim()) {
      toast.error('خلاصه مقاله را وارد کنید');
      return;
    }
    if (!editor?.getHTML() || editor.getHTML() === '<p></p>') {
      toast.error('محتوای مقاله را وارد کنید');
      return;
    }
    if (!timeForStudy) {
      toast.error('زمان خواندن مقاله را وارد کنید');
      return;
    }
    if (selectedCategories.length === 0) {
      toast.error('حداقل یک دسته‌بندی انتخاب کنید');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        title: title.trim(),
        slug: customSlug.trim() || undefined,
        description: description.trim(),
        content: editor.getHTML(),
        time_for_study: timeForStudy,
        categories: selectedCategories,
      };

      if (isEditing && blogId) {
        await blogService.update(blogId, data);
        toast.success('مقاله با موفقیت بروزرسانی شد');
      } else {
        await blogService.create(data);
        toast.success('مقاله با موفقیت ایجاد شد');
      }
      router.push('/blog/my');
    } catch (err: any) {
      const message = err.response?.data?.message || 'خطا در ذخیره مقاله';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = () => {
    const trimmed = categoryInput.trim();
    if (trimmed && !selectedCategories.includes(trimmed)) {
      setSelectedCategories([...selectedCategories, trimmed]);
      setCategoryInput('');
    }
  };

  const removeCategory = (cat: string) => {
    setSelectedCategories(selectedCategories.filter((c) => c !== cat));
  };

  const addImage = () => {
    const url = window.prompt('آدرس تصویر را وارد کنید:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = window.prompt('آدرس لینک را وارد کنید:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const toolbarBtnClass = 'p-2 rounded hover:bg-[var(--secondary)]';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        {isEditing ? 'ویرایش مقاله' : 'مقاله جدید'}
      </h1>

      <div className="space-y-4 mb-6">
        <Input
          label="عنوان"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان مقاله"
          required
        />
        <Input
          label=" Slug (اختیاری)"
          value={customSlug}
          onChange={(e) => setCustomSlug(e.target.value)}
          placeholder="slug-maghalat"
        />
        <Textarea
          label="خلاصه"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="خلاصه‌ای کوتاه از مقاله"
          rows={3}
          required
        />
        <Input
          label="زمان خواندن (دقیقه)"
          type="number"
          value={timeForStudy}
          onChange={(e) => setTimeForStudy(e.target.value)}
          placeholder="5"
          required
        />

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>دسته‌بندی‌ها</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              placeholder="نام دسته‌بندی"
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={{ borderColor: 'var(--border)' }}
            />
            <Button type="button" size="sm" onClick={addCategory}>
              افزودن
            </Button>
          </div>
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full"
                  style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                >
                  {cat}
                  <button
                    onClick={() => removeCategory(cat)}
                    className="hover:opacity-75"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="border rounded-xl overflow-hidden mb-6" style={{ borderColor: 'var(--border)' }}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b" style={{ background: 'var(--secondary)' }}>
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={toolbarBtnClass}
            style={editor?.isActive('bold') ? { background: 'var(--secondary)' } : undefined}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={toolbarBtnClass}
            style={editor?.isActive('italic') ? { background: 'var(--secondary)' } : undefined}
          >
            <Italic className="h-4 w-4" />
          </button>
          <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            className={toolbarBtnClass}
            style={editor?.isActive('heading', { level: 1 }) ? { background: 'var(--secondary)' } : undefined}
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={toolbarBtnClass}
            style={editor?.isActive('heading', { level: 2 }) ? { background: 'var(--secondary)' } : undefined}
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />
          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={toolbarBtnClass}
            style={editor?.isActive('bulletList') ? { background: 'var(--secondary)' } : undefined}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className={toolbarBtnClass}
            style={editor?.isActive('blockquote') ? { background: 'var(--secondary)' } : undefined}
          >
            <Quote className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            className={toolbarBtnClass}
            style={editor?.isActive('codeBlock') ? { background: 'var(--secondary)' } : undefined}
          >
            <Code className="h-4 w-4" />
          </button>
          <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />
          <button onClick={addImage} className={toolbarBtnClass}>
            <ImageIcon className="h-4 w-4" />
          </button>
          <button onClick={addLink} className={toolbarBtnClass}>
            <LinkIcon className="h-4 w-4" />
          </button>
          <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />
          <button
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            className={toolbarBtnClass}
            style={editor?.isActive({ textAlign: 'left' }) ? { background: 'var(--secondary)' } : undefined}
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            className={toolbarBtnClass}
            style={editor?.isActive({ textAlign: 'center' }) ? { background: 'var(--secondary)' } : undefined}
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            className={toolbarBtnClass}
            style={editor?.isActive({ textAlign: 'right' }) ? { background: 'var(--secondary)' } : undefined}
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} isLoading={isLoading}>
          {isEditing ? 'بروزرسانی مقاله' : 'انتشار مقاله'}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          انصراف
        </Button>
      </div>
    </div>
  );
}

export default function BlogEditorPage() {
  return (
    <AuthGuard>
      <BlogEditorContent />
    </AuthGuard>
  );
}
