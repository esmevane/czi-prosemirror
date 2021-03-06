// @flow

import adjustAllSelection from './adjustAllSelection';
import isInsideListItem from './isInsideListItem';
import isListNode from './isListNode';
import nullthrows from 'nullthrows';
import {Fragment, Schema, Node, NodeType, ResolvedPos} from 'prosemirror-model';
import {PARAGRAPH, BLOCKQUOTE, HEADING, LIST_ITEM} from './NodeNames';
import {Selection} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {setBlockType} from 'prosemirror-commands';
import {unwrapNodesFromList} from './toggleList';

export default function toggleBlockquote(
  tr: Transform,
  schema: Schema,
): Transform {
  const {nodes} = schema;
  const {selection, doc} = tr;
  const heading = nodes[HEADING];
  const blockquote = nodes[BLOCKQUOTE];
  const paragraph = nodes[PARAGRAPH];
  const listItem = nodes[LIST_ITEM];

  if (!selection || !doc || !heading || !paragraph || !listItem || !heading) {
    return tr;
  }

  tr = adjustAllSelection(tr, schema);

  const {from, to} = tr.selection;
  let startWithBlockQuote = null;
  const poses = [];
  const docType = doc.type;
  doc.nodesBetween(from, to, (node, pos, parentNode) => {
    const nodeType = node.type;
    const parentNodeType = parentNode.type;

    if (startWithBlockQuote === null) {
      startWithBlockQuote = nodeType === blockquote;
    }

    if (parentNodeType !== listItem) {
      poses.push(pos);
    }
    return !isListNode(node);
  });
  // Update from the bottom to avoid disruptive changes in pos.
  poses.sort().reverse().forEach(pos => {
    tr = setBlockquoteNode(
      tr,
      schema,
      pos,
    );
  });
  return tr;
}

function setBlockquoteNode(
  tr: Transform,
  schema: Schema,
  pos: number,
): Transform {
  const {nodes} = schema;
  const heading = nodes[HEADING];
  const paragraph = nodes[PARAGRAPH];
  const blockquote = nodes[BLOCKQUOTE];
  const node = tr.doc.nodeAt(pos);

  if (!node || !heading || !paragraph) {
    return tr;
  }

  const nodeType = node.type;
  if (isInsideListItem(tr.doc, pos)) {
    return tr;
  } else if (isListNode(node)) {
    // Toggle list
    if (blockquote) {
      tr = unwrapNodesFromList(tr, schema, pos, (paragraphNode) => {
        const {content, marks, attrs} = paragraphNode;
        return blockquote.create(attrs, content, marks);
      });
    }
  } else if (nodeType === blockquote) {
    // Toggle heading
    tr = tr.setNodeMarkup(
      pos,
      paragraph,
      node.attrs,
      node.marks,
    );
  } else if (nodeType === paragraph || nodeType === heading) {
    tr = tr.setNodeMarkup(
      pos,
      blockquote,
      node.attrs,
      node.marks,
    );
  }
  return tr;
}
