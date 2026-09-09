'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { blogService } from '@/services/blog.service';
import { categoryService } from '@/services/category.service';
import { CategoryEntity } from '@/types/category.types';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import AuthGuard from '@/components/auth/AuthGuard';
import toast from 'react-hot-toast';
import {
  Bold, Italic, Heading1, Heading2, List, Quote, Code, Image as ImageIcon,
  Link as LinkIcon, AlignCenter, AlignLeft, AlignRight, ListOrdered, Undo2, Redo2, X, Plus,
} from 'lucide-react';

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
  const [suggestedCategories, setSuggestedCategories] = useState<CategoryEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [blogId, setBlogId] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(isEditing);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'محتوای مقاله را اینجا بنویسید...' }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      ImageExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[340px] px-4 py-3 blog-content',
      },
    },
  });

  useEffect(() => {
    categoryService.list(1, 100)
      .then((data) => setSuggestedCategories(data.categories))
      .catch(() => {});
  }, []);

  // Load the blog being edited. All state writes happen after the await —
  // no synchronous setState inside the effect body.
  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await blogService.getBySlug(slug!);
        if (cancelled) return;
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
          setSelectedCategories(blog.categories.map((c) => c.category?.title || '').filter(Boolean));
        }
        setIsFetching(false);
      } catch {
        if (cancelled) return;
        toast.error('خطا در بارگذاری مقاله');
        router.push('/blog/my');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, slug, editor, router]);

  // Auto-generate a readable time estimate when the content changes and the
  // user has not set one manually.
  const estimateReadingTime = () => {
    const text = editor?.getText() || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return;
    const minutes = Math.max(1, Math.round(words / 200));
    setTimeForStudy(String(minutes));
    toast.success(`زمان مطالعه حدوداً ${minutes} دقیقه تخمین زده شد`);
  };

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 10) {
      toast.error('عنوان مقاله باید حداقل 10 کاراکتر باشد');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      toast.error('خلاصه مقاله باید حداقل 10 کاراکتر باشد');
      return;
    }
    const html = editor?.getHTML() || '';
    if (!html || html === '<p></p>') {
      toast.error('محتوای مقاله را وارد کنید');
      return;
    }
    if (!timeForStudy || Number(timeForStudy) <= 0) {
      toast.error('زمان مطالعه را وارد کنید');
      return;
    }
    if (selectedCategories.length === 0) {
      toast.error('حداقل یک دسته‌بندی انتخاب کنید');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title: title.trim(),
        slug: customSlug.trim() || undefined,
        description: description.trim(),
        content: html,
        time_for_study: String(timeForStudy),
        categories: selectedCategories,
      };

      if (isEditing && blogId) {
        await blogService.update(blogId, payload);
        toast.success('مقاله با موفقیت بروزرسانی شد');
      } else {
        await blogService.create(payload);
        toast.success('مقاله با موفقیت ثبت شد و در انتظار تایید است');
      }
      router.push('/blog/my');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : message || 'خطا در ذخیره مقاله');
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = (cat?: string) => {
    const trimmed = (cat ?? categoryInput).trim();
    if (trimmed && !selectedCategories.includes(trimmed)) {
      setSelectedCategories((prev) => [...prev, trimmed]);
    }
    setCategoryInput('');
  };

  const removeCategory = (cat: string) => {
    setSelectedCategories(selectedCategories.filter((c) => c !== cat));
  };

  const availableSuggestions = suggestedCategories.filter(
    (c) => !selectedCategories.includes(c.title)
  );

  const addImage = () => {
    const url = window.prompt('آدرس تصویر را وارد کنید:');
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = window.prompt('آدرس لینک را وارد کنید:');
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  const toolbarBtnClass = 'p-2 rounded-lg transition-colors';
  const activeStyle = { background: 'var(--primary-light)', color: 'var(--primary)' };
  const idleStyle = { color: 'var(--text-secondary)' };
  const divider = <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />;

  if (isFetching) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p style={{ color: 'var(--text-tertiary)' }}>در حال بارگذاری مقاله...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        {isEditing ? 'ویرایش مقاله' : 'مقاله جدید'}
      </h1>

      <div className="space-y-5 mb-6">
        <Input
          label="عنوان مقاله"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوانی جذاب برای مقاله (حداقل 10 کاراکتر)"
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="زمان مطالعه (دقیقه)"
            type="number"
            min={1}
            value={timeForStudy}
            onChange={(e) => setTimeForStudy(e.target.value)}
            placeholder="5"
            required
          />
          <div className="sm:col-span-2 flex items-end">
            <Button type="button" variant="outline" size="sm" onClick={estimateReadingTime}>
              تخمین خودکار زمان مطالعه
            </Button>
          </div>
        </div>
        <Textarea
          label="خلاصه مقاله"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="خلاصه‌ای کوتاه (10 تا 300 کاراکتر) که در کارت مقاله نمایش داده می‌شود"
          rows={3}
          required
        />
        <Input
          label="نامک — Slug (اختیاری)"
          value={customSlug}
          onChange={(e) => setCustomSlug(e.target.value)}
          placeholder="در صورت خالی بودن از روی عنوان ساخته می‌شود"
          dir="ltr"
          className="text-left"
        />

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            دسته‌بندی‌ها
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              placeholder="نام دسته‌بندی و Enter"
              className="flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
            />
            <Button type="button" size="sm" variant="outline" onClick={() => addCategory()}>
              <Plus className="h-4 w-4" />
              افزودن
            </Button>
          </div>
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full"
                  style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                >
                  {cat}
                  <button onClick={() => removeCategory(cat)} aria-label={`حذف ${cat}`} className="hover:opacity-70">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {availableSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs self-center mr-1" style={{ color: 'var(--text-tertiary)' }}>پیشنهاد:</span>
              {availableSuggestions.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => addCategory(c.title)}
                  className="px-2.5 py-0.5 text-xs rounded-full transition-opacity hover:opacity-80"
                  style={{ background: 'var(--secondary)', color: 'var(--text-secondary)' }}
                >
                  + {c.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-2xl overflow-hidden mb-8" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2" style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
          <button type="button" aria-label="بولد" onClick={() => editor?.chain().focus().toggleBold().run()} className={toolbarBtnClass} style={editor?.isActive('bold') ? activeStyle : idleStyle}><Bold className="h-4 w-4" /></button>
          <button type="button" aria-label="ایتالیک" onClick={() => editor?.chain().focus().toggleItalic().run()} className={toolbarBtnClass} style={editor?.isActive('italic') ? activeStyle : idleStyle}><Italic className="h-4 w-4" /></button>
          {divider}
          <button type="button" aria-label="تیتر ۱" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={toolbarBtnClass} style={editor?.isActive('heading', { level: 1 }) ? activeStyle : idleStyle}><Heading1 className="h-4 w-4" /></button>
          <button type="button" aria-label="تیتر ۲" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={toolbarBtnClass} style={editor?.isActive('heading', { level: 2 }) ? activeStyle : idleStyle}><Heading2 className="h-4 w-4" /></button>
          {divider}
          <button type="button" aria-label="لیست نقطه‌ای" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={toolbarBtnClass} style={editor?.isActive('bulletList') ? activeStyle : idleStyle}><List className="h-4 w-4" /></button>
          <button type="button" aria-label="لیست شماره‌دار" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={toolbarBtnClass} style={editor?.isActive('orderedList') ? activeStyle : idleStyle}><ListOrdered className="h-4 w-4" /></button>
          <button type="button" aria-label="نقل قول" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={toolbarBtnClass} style={editor?.isActive('blockquote') ? activeStyle : idleStyle}><Quote className="h-4 w-4" /></button>
          <button type="button" aria-label="بلوک کد" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={toolbarBtnClass} style={editor?.isActive('codeBlock') ? activeStyle : idleStyle}><Code className="h-4 w-4" /></button>
          {divider}
          <button type="button" aria-label="تصویر" onClick={addImage} className={toolbarBtnClass} style={idleStyle}><ImageIcon className="h-4 w-4" /></button>
          <button type="button" aria-label="لینک" onClick={addLink} className={toolbarBtnClass} style={editor?.isActive('link') ? activeStyle : idleStyle}><LinkIcon className="h-4 w-4" /></button>
          {divider}
          <button type="button" aria-label="چپ‌چین" onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={toolbarBtnClass} style={editor?.isActive({ textAlign: 'left' }) ? activeStyle : idleStyle}><AlignLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="وسط‌چین" onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={toolbarBtnClass} style={editor?.isActive({ textAlign: 'center' }) ? activeStyle : idleStyle}><AlignCenter className="h-4 w-4" /></button>
          <button type="button" aria-label="راست‌چین" onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={toolbarBtnClass} style={editor?.isActive({ textAlign: 'right' }) ? activeStyle : idleStyle}><AlignRight className="h-4 w-4" /></button>
          {divider}
          <button type="button" aria-label="واگرد" onClick={() => editor?.chain().focus().undo().run()} className={toolbarBtnClass} style={idleStyle}><Undo2 className="h-4 w-4" /></button>
          <button type="button" aria-label="ازنو" onClick={() => editor?.chain().focus().redo().run()} className={toolbarBtnClass} style={idleStyle}><Redo2 className="h-4 w-4" /></button>
        </div>
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center gap-3 pb-8">
        <Button onClick={handleSubmit} isLoading={isLoading} size="lg">
          {isEditing ? 'ذخیره تغییرات' : 'ثبت مقاله'}
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
