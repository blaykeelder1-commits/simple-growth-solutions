"use client";

import { useState, useEffect } from "react";

interface NotesEditorProps {
  initialNotes: string;
  onChange: (notes: string) => void;
}

export function NotesEditor({ initialNotes, onChange }: NotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    onChange(newNotes);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Internal Notes
      </label>
      <textarea
        value={notes}
        onChange={handleChange}
        rows={6}
        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
        placeholder="Add notes about this lead..."
      />
      <p className="text-xs text-gray-500">
        Notes are only visible to admin users
      </p>
    </div>
  );
}
