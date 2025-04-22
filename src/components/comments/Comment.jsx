import React, { useState, useEffect } from 'react';
import CommentBottomSheet from './CommentBottomSheet';

/**
 * Compatibility wrapper that allows existing components to use the new CommentBottomSheet
 * without changing their implementation.
 * 
 * This component preserves the same props interface as the original Comment component,
 * but renders the Instagram-style bottom sheet instead.
 */
const Comment = (props) => {
  // The original Comment component's props are passed through directly to the bottom sheet
  const { journalEntryId, sotdId, isSotd, currentUsername, onClose , inContainer} = props;
  
  // Use a mount flag to handle animation gracefully
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Set mounted to true on the next tick to trigger animations properly
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);
  
  // If not mounted yet, render nothing
  if (!mounted) return null;
  
  return (
    <CommentBottomSheet
      journalEntryId={journalEntryId}
      sotdId={sotdId}
      isSotd={isSotd}
      inContainer={inContainer}
      currentUsername={currentUsername}
      onClose={onClose}
    />
  );
};

export default Comment;