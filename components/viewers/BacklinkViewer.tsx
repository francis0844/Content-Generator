import React from 'react';
import { Topic } from '../../types';
import { Link as LinkIcon, ExternalLink, FileText } from 'lucide-react';

interface BacklinkViewerProps {
  topic: Topic;
}

export const BacklinkViewer: React.FC<BacklinkViewerProps> = ({ topic }) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto w-full space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-10">
                 <div className="flex items-center gap-3 mb-6">
                     <LinkIcon className="w-6 h-6 text-indigo-600" />
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Backlink Strategy</h2>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                         <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 block">Anchor Text</label>
                         <div className="text-xl font-bold text-gray-900 dark:text-white">"{topic.anchorText}"</div>
                     </div>
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                         <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 block">Target URL</label>
                         <a href={topic.destinationUrl} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline break-all block">
                             {topic.destinationUrl} <ExternalLink className="w-3 h-3 inline ml-1" />
                         </a>
                     </div>
                 </div>
                 
                 <div className="border-t border-gray-100 dark:border-gray-700 pt-8">
                     <h3 className="font-bold text-gray-900 dark:text-white mb-4">Content Deliverable</h3>
                     {topic.documentUrl ? (
                         <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                             <FileText className="w-16 h-16 text-blue-500 mb-4" />
                             <p className="text-gray-500 mb-6 text-center max-w-md">
                                 The content for this backlink has been generated and exported to a Google Doc.
                             </p>
                             <a 
                                 href={topic.documentUrl} 
                                 target="_blank" 
                                 rel="noreferrer"
                                 className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-all flex items-center gap-2"
                             >
                                 Open Google Doc
                                 <ExternalLink className="w-4 h-4" />
                             </a>
                         </div>
                     ) : (
                         <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                             <p className="text-gray-400 italic">No document URL available.</p>
                         </div>
                     )}
                 </div>
            </div>
        </div>
    </div>
  );
};
