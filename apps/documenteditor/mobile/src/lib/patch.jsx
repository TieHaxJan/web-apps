/*
 * Copyright (C) Ascensio System SIA, 2009-2026
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation, together with the
 * additional terms provided in the LICENSE file.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. For
 * details, see the GNU AGPL at: https://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA by email at info@onlyoffice.com
 * or by postal mail at 20A-6 Ernesta Birznieka-Upisha Street, Riga,
 * LV-1050, Latvia, European Union.
 *
 * The interactive user interfaces in modified versions of the Program
 * are required to display Appropriate Legal Notices in accordance with
 * Section 5 of the GNU AGPL version 3.
 *
 * No trademark rights are granted under this License.
 *
 * All non-code elements of the Product, including illustrations,
 * icon sets, and technical writing content, are licensed under the
 * Creative Commons Attribution-ShareAlike 4.0 International License:
 * https://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 * This license applies only to such non-code elements and does not
 * modify or replace the licensing terms applicable to the Program's
 * source code, which remains licensed under the GNU Affero General
 * Public License v3.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * Document Editor (mobile): editing support.
 *
 * The upstream repository ships this file as a stub (every hook is a no-op and
 * isSupportEditFeature() is false), which forces the mobile editor into
 * view-only mode. This version implements the hooks again. The logic is
 * reconstructed from the implementation that was public in this repository
 * before it was moved out into a private module (April 2021), adapted to the
 * current stores and SDK callbacks.
 */

import React, { Fragment } from 'react';
import { Link } from 'framework7-react';
import { Device } from '../../../../common/mobile/utils/device';
import SvgIcon from '@common/lib/component/SvgIcon';
import IconUndoIos from '@common-ios-icons/icon-undo.svg?ios';
import IconUndoAndroid from '@common-android-icons/icon-undo.svg';
import IconRedoIos from '@common-ios-icons/icon-redo.svg?ios';
import IconRedoAndroid from '@common-android-icons/icon-redo.svg';
import IconEditSettingsIos from '@common-ios-icons/icon-edit-settings.svg?ios';
import IconEditSettingsAndroid from '@common-android-icons/icon-edit-settings.svg';
import IconPlusIos from '@common-ios-icons/icon-plus.svg?ios';
import IconPlusAndroid from '@common-android-icons/icon-plus.svg';
// The context menu renders these by symbol id. Nothing else imports them, so without the
// imports the symbols are missing from the bundle and the cut/copy/paste buttons are blank.
import IconCopy from '@common-icons/icon-copy.svg';
import IconCut from '@common-icons/icon-cut.svg';
import IconPaste from '@common-icons/icon-paste.svg';
import {
    AddCommentController,
    EditCommentController
} from '../../../../common/mobile/lib/controller/collaboration/Comments';

const EditorUIController = () => {
    return null
};

const api = () => Common.EditorApi.get();

// --- edit mode ---------------------------------------------------------------

EditorUIController.isSupportEditFeature = () => {
    return true
};

// --- theme colors ------------------------------------------------------------

EditorUIController.initThemeColors = () => {
    api().asc_registerCallback('asc_onSendThemeColors', (colors, standart_colors) => {
        Common.Utils.ThemeColor.setColors(colors, standart_colors);
    });
};

// --- text settings -----------------------------------------------------------

EditorUIController.initFonts = (storeTextSettings) => {
    const sdk = api();

    sdk.asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        storeTextSettings.initEditorFonts(fonts, select);
    });
    sdk.asc_registerCallback('asc_onFontFamily', (font) => {
        storeTextSettings.resetFontName(font);
    });
    sdk.asc_registerCallback('asc_onFontSize', (size) => {
        storeTextSettings.resetFontSize(size);
    });
    sdk.asc_registerCallback('asc_onBold', (isBold) => {
        storeTextSettings.resetIsBold(isBold);
    });
    sdk.asc_registerCallback('asc_onItalic', (isItalic) => {
        storeTextSettings.resetIsItalic(isItalic);
    });
    sdk.asc_registerCallback('asc_onUnderline', (isUnderline) => {
        storeTextSettings.resetIsUnderline(isUnderline);
    });
    sdk.asc_registerCallback('asc_onStrikeout', (isStrikeout) => {
        storeTextSettings.resetIsStrikeout(isStrikeout);
    });
};

// --- paragraph / table / chart settings --------------------------------------

EditorUIController.initEditorStyles = (storeParagraphSettings) => {
    const sdk = api();

    sdk.asc_setParagraphStylesSizes(330, 38);
    sdk.asc_registerCallback('asc_onInitEditorStyles', (styles) => {
        storeParagraphSettings.initEditorStyles(styles);
    });
    sdk.asc_registerCallback('asc_onParaStyleName', (name) => {
        storeParagraphSettings.changeParaStyleName(name);
    });
};

EditorUIController.initTableTemplates = (storeTableSettings) => {
    api().asc_registerCallback('asc_onInitTableTemplates', (templates) => {
        storeTableSettings.initTableTemplates(templates);
    });
};

EditorUIController.updateChartStyles = (storeChartSettings, storeFocusObjects) => {
    const sdk = api();

    sdk.asc_registerCallback('asc_onUpdateChartStyles', () => {
        const chartObject = storeFocusObjects.chartObject;

        if (chartObject && chartObject.get_ChartProperties()) {
            storeChartSettings.updateChartStyles(sdk.asc_getChartPreviews(chartObject.get_ChartProperties().getType()));
        }
    });
};

// --- focus objects -----------------------------------------------------------

EditorUIController.initFocusObjects = (storeFocusObjects) => {
    api().asc_registerCallback('asc_onFocusObject', objects => {
        storeFocusObjects.resetFocusObjects(objects);
    });

    // The store reads its selection through this interface; the stack is read
    // from the observable property on every call so computed values stay reactive.
    const objects = () => storeFocusObjects._focusObjects || [];

    // Returns the value of the last (top) object matching the predicate.
    const getTop = (predicate) => {
        const found = objects().filter(predicate);

        return found.length > 0 ? found[found.length - 1].get_ObjectValue() : undefined;
    };

    storeFocusObjects.intf = {
        filterFocusObjects: () => {
            const _settings = [];

            for (let object of objects()) {
                const type = object.get_ObjectType();

                if (Asc.c_oAscTypeSelectElement.Paragraph === type) {
                    _settings.push('text', 'paragraph');
                } else if (Asc.c_oAscTypeSelectElement.Table === type) {
                    _settings.push('table');
                } else if (Asc.c_oAscTypeSelectElement.Image === type) {
                    if (object.get_ObjectValue().get_ChartProperties()) {
                        // Exclude shapes if chart exist
                        const si = _settings.indexOf('shape');
                        si < 0 ? _settings.push('chart') : _settings.splice(si, 1, 'chart');
                    } else if (object.get_ObjectValue().get_ShapeProperties() && !_settings.includes('chart')) {
                        _settings.push('shape');
                    } else {
                        _settings.push('image');
                    }
                } else if (Asc.c_oAscTypeSelectElement.Hyperlink === type) {
                    _settings.push('hyperlink');
                } else if (Asc.c_oAscTypeSelectElement.Header === type) {
                    _settings.push('header');
                }
            }

            return _settings.filter((value, index, self) => self.indexOf(value) === index);
        },

        getHeaderObject: () => getTop(o => o.get_ObjectType() == Asc.c_oAscTypeSelectElement.Header),

        getParagraphObject: () => getTop(o => o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Paragraph),

        getShapeObject: () => getTop(o =>
            o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image &&
            o.get_ObjectValue() && o.get_ObjectValue().get_ShapeProperties()),

        getImageObject: () => getTop(o => {
            if (o.get_ObjectType() != Asc.c_oAscTypeSelectElement.Image) return false;
            const value = o.get_ObjectValue();

            return value && value.get_ShapeProperties() === null && value.get_ChartProperties() === null;
        }),

        getTableObject: () => getTop(o => o.get_ObjectType() == Asc.c_oAscTypeSelectElement.Table),

        // Only Image objects carry chart properties; other object values (e.g. paragraphs)
        // have no get_ChartProperties() and would throw.
        getChartObject: () => getTop(o =>
            o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image &&
            o.get_ObjectValue() && o.get_ObjectValue().get_ChartProperties()),

        getLinkObject: () => getTop(o => o.get_ObjectType() == Asc.c_oAscTypeSelectElement.Hyperlink),
    };
};

// --- comments ----------------------------------------------------------------

EditorUIController.getEditCommentControllers = () => (
    <Fragment>
        <AddCommentController />
        <EditCommentController />
    </Fragment>
);

// --- toolbar -----------------------------------------------------------------

EditorUIController.getUndoRedo = ({ disabledUndo, disabledRedo, onUndoClick, onRedoClick }) => (
    <Fragment>
        <Link iconOnly key='undo-link' id='btn-undo' href={false}
              className={disabledUndo ? 'disabled' : ''}
              onClick={onUndoClick}>
            <SvgIcon slot="media" symbolId={(Device.ios ? IconUndoIos : IconUndoAndroid).id} className={'icon icon-svg'} />
        </Link>
        <Link iconOnly key='redo-link' id='btn-redo' href={false}
              className={disabledRedo ? 'disabled' : ''}
              onClick={onRedoClick}>
            <SvgIcon slot="media" symbolId={(Device.ios ? IconRedoIos : IconRedoAndroid).id} className={'icon icon-svg'} />
        </Link>
    </Fragment>
);

EditorUIController.getToolbarOptions = ({ disabledEdit, disabledAdd, onEditClick, onAddClick }) => (
    <Fragment>
        <Link iconOnly key='edit-settings-link' id='btn-edit' href={false}
              className={disabledEdit ? 'disabled' : ''}
              onClick={onEditClick}>
            <SvgIcon slot="media" symbolId={(Device.ios ? IconEditSettingsIos : IconEditSettingsAndroid).id} className={'icon icon-svg'} />
        </Link>
        <Link iconOnly key='add-link' id='btn-add' href={false}
              className={disabledAdd ? 'disabled' : ''}
              onClick={onAddClick}>
            <SvgIcon slot="media" symbolId={(Device.ios ? IconPlusIos : IconPlusAndroid).id} className={'icon icon-svg'} />
        </Link>
    </Fragment>
);

// --- context menu ------------------------------------------------------------
//
// `ctx` is the ContextMenu controller instance. Only events handled here return
// true from handleMenuItemClick; everything else (cut, copy, paste, ...) falls
// through to the controller's own switch.

EditorUIController.ContextMenu = {
    mapMenuItems: (ctx) => {
        const { t, isEdit, canViewComments, canReview, isDisconnected } = ctx.props;
        const _t = t("ContextMenu", { returnObjects: true });
        const sdk = api();
        const stack = sdk.getSelectedElements();
        const canCopy = sdk.can_CopyCut();
        const inToc = sdk.asc_GetTableOfContentsPr(true);

        const itemsIcon = [],
            itemsText = [];

        ctx.extraItems = [];

        if (canCopy) {
            itemsIcon.push({
                event: 'copy',
                icon: IconCopy.id
            });
        }

        if (canViewComments && ctx.isComments && !isEdit) {
            itemsText.push({
                caption: _t.menuViewComment,
                event: 'viewcomment'
            });
        }

        let isText = false,
            isTable = false,
            isImage = false,
            isChart = false,
            isShape = false,
            isLink = false,
            lockedText = false,
            lockedTable = false,
            lockedImage = false,
            lockedHeader = false;

        stack.forEach(item => {
            const objectType = item.get_ObjectType(),
                objectValue = item.get_ObjectValue();

            if (objectType == Asc.c_oAscTypeSelectElement.Header) {
                lockedHeader = objectValue.get_Locked();
            } else if (objectType == Asc.c_oAscTypeSelectElement.Paragraph) {
                lockedText = objectValue.get_Locked();
                isText = true;
            } else if (objectType == Asc.c_oAscTypeSelectElement.Image) {
                lockedImage = objectValue.get_Locked();

                if (objectValue && objectValue.get_ChartProperties()) {
                    isChart = true;
                } else if (objectValue && objectValue.get_ShapeProperties()) {
                    isShape = true;
                } else {
                    isImage = true;
                }
            } else if (objectType == Asc.c_oAscTypeSelectElement.Table) {
                lockedTable = objectValue.get_Locked();
                isTable = true;
            } else if (objectType == Asc.c_oAscTypeSelectElement.Hyperlink) {
                isLink = true;
            }
        });

        if (stack.length > 0) {
            const unlocked = !lockedText && !lockedTable && !lockedImage && !lockedHeader;

            if (isEdit && !isDisconnected) {
                if (unlocked && canCopy) {
                    // 'Cut' goes before 'Copy'
                    itemsIcon.unshift({
                        event: 'cut',
                        icon: IconCut.id
                    });
                }

                if (unlocked) {
                    itemsIcon.push({
                        event: 'paste',
                        icon: IconPaste.id
                    });
                }

                if (isTable && sdk.CheckBeforeMergeCells() && !lockedTable && !lockedHeader) {
                    itemsText.push({
                        caption: _t.menuMerge,
                        event: 'merge'
                    });
                }

                if (isTable && sdk.CheckBeforeSplitCells() && !lockedTable && !lockedHeader) {
                    itemsText.push({
                        caption: _t.menuSplit,
                        event: 'split'
                    });
                }

                if (unlocked) {
                    itemsText.push({
                        caption: _t.menuDelete,
                        event: 'delete'
                    });
                }

                if (isTable && !lockedTable && !lockedText && !lockedHeader) {
                    itemsText.push({
                        caption: _t.menuDeleteTable,
                        event: 'deletetable'
                    });
                }

                if (unlocked) {
                    itemsText.push({
                        caption: _t.menuEdit,
                        event: 'edit'
                    });
                }

                if (!!sdk.can_AddHyperlink() && !lockedHeader) {
                    itemsText.push({
                        caption: _t.menuAddLink,
                        event: 'addlink'
                    });
                }

                if (canReview) {
                    if (ctx.inRevisionChange) {
                        itemsText.push({
                            caption: _t.menuReviewChange,
                            event: 'reviewchange'
                        });
                    } else {
                        itemsText.push({
                            caption: _t.menuReview,
                            event: 'review'
                        });
                    }
                }

                if (ctx.isComments && canViewComments) {
                    itemsText.push({
                        caption: _t.menuViewComment,
                        event: 'viewcomment'
                    });
                }

                const isObject = isShape || isChart || isImage || isTable;
                const hideAddComment = !canViewComments || sdk.can_AddQuotedComment() === false || !unlocked || (!isText && isObject);

                if (!hideAddComment) {
                    itemsText.push({
                        caption: _t.menuAddComment,
                        event: 'addcomment'
                    });
                }

                if (inToc) {
                    itemsText.push({
                        caption: t('ContextMenu.textRefreshEntireTable'),
                        event: 'refreshEntireTable'
                    });
                    itemsText.push({
                        caption: t('ContextMenu.textRefreshPageNumbersOnly'),
                        event: 'refreshPageNumbers'
                    });
                }
            }
        }

        if (isLink) {
            itemsText.push({
                caption: _t.menuOpenLink,
                event: 'openlink'
            });
        }

        if (Device.phone && itemsText.length > 2) {
            ctx.extraItems = itemsText.splice(2, itemsText.length, {
                caption: _t.menuMore,
                event: 'showActionSheet'
            });
        }

        return itemsIcon.concat(itemsText);
    },

    handleMenuItemClick: (ctx, action) => {
        const sdk = api();

        switch (action) {
            // If the browser blocks the clipboard call, return false so the controller
            // shows its "use the keyboard shortcut" hint, as it did before.
            case 'cut':
                return !!sdk.Cut();
            case 'paste':
                return !!sdk.Paste();
            case 'addcomment':
                Common.Notifications.trigger('addcomment');
                return true;
            case 'merge':
                sdk.MergeCells();
                return true;
            case 'split':
                ctx.showSplitModal();
                return true;
            case 'delete':
                sdk.asc_Remove();
                return true;
            case 'deletetable':
                sdk.remTable();
                return true;
            case 'edit':
            case 'editlink':
                setTimeout(() => {
                    ctx.props.openOptions('edit');
                }, 0);
                return true;
            case 'addlink':
                setTimeout(() => {
                    ctx.props.openOptions('add', 'link');
                }, 400);
                return true;
        }

        return false;
    },
};

export default EditorUIController;
