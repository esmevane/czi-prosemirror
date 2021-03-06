// @flow

import './czi-editor-toolbar.css';
import * as EditorCommands from '../EditorCommands';
import CommandButton from './CommandButton';
import CommandMenuButton from './CommandMenuButton';
import FontSizeCommandMenuButton from './FontSizeCommandMenuButton';
import FontTypeCommandMenuButton from './FontTypeCommandMenuButton';
import Icon from './Icon';
import React from 'react';
import UICommand from './UICommand';
import createEmptyEditorState from '../createEmptyEditorState';
import findActiveMark from '../findActiveMark';
import isReactClass from './isReactClass';
import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {Transform} from 'prosemirror-transform';

const EDITOR_EMPTY_STATE = createEmptyEditorState();
const ICON_LABEL_PATTERN = /[a-z_]+/;

const {
  BLOCKQUOTE_INFO,
  CLEAR_FORMAT,
  CODE,
  EM,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  HISTORY_REDO,
  HISTORY_UNDO,
  HR,
  IMAGE_FROM_URL,
  INDENT_LESS,
  INDENT_MORE,
  LINK_SET_URL,
  OL,
  PRINT,
  STRIKE,
  STRONG,
  TABLE_ADD_COLUMN_AFTER,
  TABLE_ADD_COLUMN_BEFORE,
  TABLE_ADD_ROW_AFTER,
  TABLE_ADD_ROW_BEFORE,
  TABLE_CELL_COLOR,
  TABLE_DELETE_COLUMN,
  TABLE_DELETE_ROW,
  TABLE_DELETE_TABLE,
  TABLE_INSERT_TABLE,
  TABLE_MERGE_CELLS,
  TABLE_MOVE_TO_NEXT_CELL,
  TABLE_MOVE_TO_PREV_CELL,
  TABLE_SPLIT_CELL,
  TABLE_TOGGLE_HEADER_CELL,
  TABLE_TOGGLE_HEADER_COLUMN,
  TABLE_TOGGLE_HEADER_ROW,
  TEXT_ALIGN_CENTER,
  TEXT_ALIGN_JUSTIFY,
  TEXT_ALIGN_LEFT,
  TEXT_ALIGN_RIGHT,
  TEXT_COLOR,
  TEXT_HIGHLIGHT,
  TEXT_LINE_SPACINGS,
  UL,
  UNDERLINE,
} = EditorCommands;

const CommandGroups = [
  {
    undo: HISTORY_UNDO,
    redo: HISTORY_REDO,
    print: PRINT,
  },
  {
    grid_on: [
      {
        'Insert Table...': TABLE_INSERT_TABLE,
      },
      {
        'Fill Color...': TABLE_CELL_COLOR,
      },
      {
        'Insert Column Before': TABLE_ADD_COLUMN_BEFORE,
        'Insert Column After': TABLE_ADD_COLUMN_AFTER,
        'Delete Column': TABLE_DELETE_COLUMN,
      },
      {
        'Insert Row Before': TABLE_ADD_ROW_BEFORE,
        'Insert Row After': TABLE_ADD_ROW_AFTER,
        'Delete Row': TABLE_DELETE_ROW,
      },
      {
        'Merge Cells': TABLE_MERGE_CELLS,
        'Split Cells': TABLE_SPLIT_CELL,
      },
      // Disable these commands cause user rarely use them.
      {
        'Toggle Header Column': TABLE_TOGGLE_HEADER_COLUMN,
        'Toggle Header Cow': TABLE_TOGGLE_HEADER_ROW,
        'Toggle Header Cells': TABLE_TOGGLE_HEADER_CELL,
      },
      {
        'Delete Table': TABLE_DELETE_TABLE,
      },
    ],
  },
  {
    'H1 ': H1,
    'H2 ': H2,
    'keyboard_arrow_down': [{
      'Header 3': H3,
      'Header 4': H4,
      'Header 5': H5,
      'Header 6': H6,
    }],
  },
  {
    font_download: FontTypeCommandMenuButton,
  },
  {
    format_size: FontSizeCommandMenuButton,
  },
  {
    format_bold: STRONG,
    format_italic: EM,
    format_underline: UNDERLINE,
    format_color_text: TEXT_COLOR,
    border_color: TEXT_HIGHLIGHT,
  },
  {
    link: LINK_SET_URL,
    // comment: COMMENT,
    image: IMAGE_FROM_URL,
  },
  {
    format_align_left: TEXT_ALIGN_LEFT,
    format_align_center: TEXT_ALIGN_CENTER,
    format_align_right: TEXT_ALIGN_RIGHT,
    format_align_justify: TEXT_ALIGN_JUSTIFY,
  },
  {
    format_line_spacing: TEXT_LINE_SPACINGS,
  },
  {
    format_list_numbered: OL,
    format_list_bulleted: UL,
  },
  {
    format_indent_increase: INDENT_MORE,
    format_indent_decrease: INDENT_LESS,
  },
  {
    format_clear: CLEAR_FORMAT,
  },
  {
    hr: HR,
    code: CODE,
    format_strikethrough: STRIKE,
    format_quote: BLOCKQUOTE_INFO,
  },
];

class EditorToolbar extends React.PureComponent<any, any, any> {

  props: {
    editorState: EditorState,
    editorView: ?EditorView,
    onChange?: ?(state: EditorState) => void,
    onReady?: ?(view: EditorView) => void,
  };

  render(): React.Element<any> {
    return (
      <div className="czi-editor-toolbar">
        {CommandGroups.map(this._renderButtonsGroup)}
      </div>
    );
  }

  _renderButtonsGroup = (group: Object, index: number): React.Element<any> => {
    const buttons = Object.keys(group).map(label => {
      const obj = group[label];

      if (isReactClass(obj)) {
        // JSX requies the component to be named with upper camel case.
        const ThatComponent = obj;
        const {editorState, editorView} = this.props;
        return (
          <ThatComponent
            dispatch={this._dispatchTransaction}
            editorState={editorState}
            editorView={editorView}
            key={label}
          />
        );
      } else if (obj instanceof UICommand) {
        return this._renderButton(label, obj);
      } else if (Array.isArray(obj)) {
        return this._renderMenuButton(label, obj );
      } else {
        return null;
      }
    }).filter(Boolean);
    return (
      <div key={'g' + String(index)} className="czi-custom-buttons">
        {buttons}
      </div>
    );
  };

  _renderMenuButton = (
    label: string,
    commandGroups: Array<{[string]: UICommand}>,
  ): React.Element<any> => {
    const {editorState, editorView} = this.props;
    let icon = ICON_LABEL_PATTERN.test(label) ?
      <Icon type={label} /> :
      null;
    return (
      <CommandMenuButton
        commandGroups={commandGroups}
        dispatch={this._dispatchTransaction}
        editorState={editorState || EDITOR_EMPTY_STATE}
        editorView={editorView}
        key={label}
        label={icon ? null : label}
        icon={icon}
      />
    );
  };

  _renderButton = (label: string, command: UICommand): React.Element<any> => {
    const {editorState, editorView} = this.props;
    let icon;
    if (ICON_LABEL_PATTERN.test(label)) {
      icon = <Icon type={label} />;
    }
    return (
      <CommandButton
        command={command}
        dispatch={this._dispatchTransaction}
        editorState={editorState || EDITOR_EMPTY_STATE}
        editorView={editorView}
        icon={icon}
        key={label}
        label={icon ? null : label}
      />
    );
  };

  _dispatchTransaction = (transaction: Transform): void => {
    const {onChange, editorState} = this.props;
    const nextState = (editorState || EDITOR_EMPTY_STATE).apply(transaction);
    onChange && onChange(nextState);
  };
}

export default EditorToolbar;
