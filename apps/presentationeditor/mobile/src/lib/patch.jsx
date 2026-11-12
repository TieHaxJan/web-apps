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
 * Presentation Editor (mobile): editing support.
 *
 * The upstream repository ships this file as a stub, which forces the mobile
 * editor into view-only mode. This version implements the hooks again, based
 * on the implementation that was public in this repository before it was moved
 * out into a private module (April 2021), adapted to the current stores.
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

const EditorUIController = () => null;

const api = () => Common.EditorApi.get();

EditorUIController.isSupportEditFeature = () => true;

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

// --- slide / table / chart settings ------------------------------------------

EditorUIController.initEditorStyles = (storeSlideSettings) => {
    const sdk = api();

    sdk.asc_registerCallback('asc_onInitEditorStyles', themes => {
        storeSlideSettings.addArrayThemes(themes);
    });
    sdk.asc_registerCallback('asc_onUpdateThemeIndex', themeId => {
        storeSlideSettings.changeSlideThemeIndex(themeId);
    });
    sdk.asc_registerCallback('asc_onUpdateLayout', layouts => {
        storeSlideSettings.addArrayLayouts(layouts);
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

        if (chartObject) {
            storeChartSettings.updateChartStyles(sdk.asc_getChartPreviews(chartObject.getType()));
        }
    });
};

// --- focus objects -----------------------------------------------------------

EditorUIController.initFocusObjects = (storeFocusObjects) => {
    api().asc_registerCallback('asc_onFocusObject', objects => {
        storeFocusObjects.resetFocusObjects(objects);
    });

    // Read the stack from the observable property on every call so the
    // computed values in the store stay reactive.
    const objects = () => storeFocusObjects._focusObjects || [];

    // Returns the value of the last (top) object matching the predicate.
    const getTop = (predicate) => {
        const found = objects().filter(predicate);

        return found.length > 0 ? found[found.length - 1].get_ObjectValue() : undefined;
    };

    const byType = (type) => (o) => o.get_ObjectType() === type;

    storeFocusObjects.intf = {
        filterFocusObjects: () => {
            const _settings = [];
            let no_text = true;

            for (let object of objects()) {
                const type = object.get_ObjectType(),
                    objectValue = object.get_ObjectValue();

                if (Asc.c_oAscTypeSelectElement.Paragraph == type) {
                    if (!objectValue.get_Locked())
                        no_text = false;
                } else if (Asc.c_oAscTypeSelectElement.Table == type) {
                    if (!objectValue.get_Locked()) {
                        _settings.push('table');
                        no_text = false;
                    }
                } else if (Asc.c_oAscTypeSelectElement.Slide == type) {
                    if (!(objectValue.get_LockLayout() || objectValue.get_LockBackground() || objectValue.get_LockTransition() || objectValue.get_LockTiming()))
                        _settings.push('slide');
                } else if (Asc.c_oAscTypeSelectElement.Image == type) {
                    if (!objectValue.get_Locked())
                        _settings.push('image');
                } else if (Asc.c_oAscTypeSelectElement.Chart == type) {
                    if (!objectValue.get_Locked())
                        _settings.push('chart');
                } else if (Asc.c_oAscTypeSelectElement.Shape == type && !objectValue.get_FromChart()) {
                    if (!objectValue.get_Locked()) {
                        _settings.push('shape');
                        no_text = false;
                    }
                } else if (Asc.c_oAscTypeSelectElement.Hyperlink == type) {
                    _settings.push('hyperlink');
                }
            }

            if (!no_text && _settings.indexOf('image') < 0)
                _settings.unshift('text');

            const resultArr = _settings.filter((value, index, self) => self.indexOf(value) === index); // get uniq array

            // Exclude hyperlink if text is locked
            if (resultArr.indexOf('hyperlink') > -1 && resultArr.indexOf('text') < 0) {
                resultArr.splice(resultArr.indexOf('hyperlink'), 1);
            }

            // Exclude shapes if chart exist
            if (resultArr.indexOf('chart') > -1 && resultArr.indexOf('shape') > -1) {
                resultArr.splice(resultArr.indexOf('shape'), 1);
            }

            return resultArr;
        },

        getSlideObject: () => getTop(byType(Asc.c_oAscTypeSelectElement.Slide)),

        getParagraphObject: () => getTop(byType(Asc.c_oAscTypeSelectElement.Paragraph)),

        getShapeObject: () => getTop(byType(Asc.c_oAscTypeSelectElement.Shape)),

        getImageObject: () => getTop(o => o.get_ObjectType() == Asc.c_oAscTypeSelectElement.Image && o.get_ObjectValue()),

        getTableObject: () => getTop(byType(Asc.c_oAscTypeSelectElement.Table)),

        getChartObject: () => getTop(byType(Asc.c_oAscTypeSelectElement.Chart)),

        getLinkObject: () => getTop(byType(Asc.c_oAscTypeSelectElement.Hyperlink)),
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
        const { t, isEdit, canViewComments, isDisconnected } = ctx.props;
        const _t = t("ContextMenu", { returnObjects: true });
        const sdk = api();
        const stack = sdk.getSelectedElements();
        const canCopy = sdk.can_CopyCut();

        const itemsIcon = [],
            itemsText = [];

        ctx.extraItems = [];

        let isText = false,
            isTable = false,
            isImage = false,
            isChart = false,
            isShape = false,
            isLink = false;

        stack.forEach(item => {
            const objectType = item.get_ObjectType();

            if (objectType == Asc.c_oAscTypeSelectElement.Paragraph) {
                isText = true;
            } else if (objectType == Asc.c_oAscTypeSelectElement.Image) {
                isImage = true;
            } else if (objectType == Asc.c_oAscTypeSelectElement.Chart) {
                isChart = true;
            } else if (objectType == Asc.c_oAscTypeSelectElement.Shape) {
                isShape = true;
            } else if (objectType == Asc.c_oAscTypeSelectElement.Table) {
                isTable = true;
            } else if (objectType == Asc.c_oAscTypeSelectElement.Hyperlink) {
                isLink = true;
            }
        });

        const isObject = isText || isImage || isChart || isShape || isTable;

        if (canCopy && isObject) {
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

        if (stack.length > 0) {
            const topObjectValue = stack[stack.length - 1].get_ObjectValue();
            let objectLocked = typeof topObjectValue.get_Locked === 'function' ? topObjectValue.get_Locked() : false;

            !objectLocked && (objectLocked = typeof topObjectValue.get_LockDelete === 'function' ? topObjectValue.get_LockDelete() : false);

            if (!objectLocked && isEdit && !isDisconnected) {
                if (canCopy && isObject) {
                    // 'Cut' goes before 'Copy'
                    itemsIcon.unshift({
                        event: 'cut',
                        icon: IconCut.id
                    });
                }

                itemsIcon.push({
                    event: 'paste',
                    icon: IconPaste.id
                });

                if (isObject) {
                    itemsText.push({
                        caption: _t.menuDelete,
                        event: 'delete'
                    });
                }

                itemsText.push({
                    caption: _t.menuEdit,
                    event: 'edit'
                });

                if (!isLink && sdk.can_AddHyperlink() !== false) {
                    itemsText.push({
                        caption: _t.menuAddLink,
                        event: 'addlink'
                    });
                }

                if (ctx.isComments && canViewComments) {
                    itemsText.push({
                        caption: _t.menuViewComment,
                        event: 'viewcomment'
                    });
                }

                const hideAddComment = (isText && isChart) || sdk.can_AddQuotedComment() === false || !canViewComments;

                if (!hideAddComment) {
                    itemsText.push({
                        caption: _t.menuAddComment,
                        event: 'addcomment'
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
            case 'delete':
                sdk.asc_Remove();
                return true;
            case 'edit':
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
