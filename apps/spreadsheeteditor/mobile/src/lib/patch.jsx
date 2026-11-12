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
 * Spreadsheet Editor (mobile): editing support.
 *
 * The upstream repository ships this file as a stub, which forces the mobile
 * editor into view-only mode. This version implements the hooks again, based
 * on the implementation that was public in this repository before it was moved
 * out into a private module (April 2021), adapted to the current stores.
 *
 * Parts that did not exist publicly and were written from scratch against the
 * current stores: the selection mode switch (changeFocus), the table object
 * getter and the Edit/Add toolbar disabled logic.
 */

import React, { Fragment } from 'react';
import { Link, f7 } from 'framework7-react';
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

const EditorUIController = () => null;

const api = () => Common.EditorApi.get();

EditorUIController.isSupportEditFeature = () => true;

// --- theme colors ------------------------------------------------------------

EditorUIController.initThemeColors = () => {
    api().asc_registerCallback('asc_onSendThemeColors', (colors, standart_colors) => {
        Common.Utils.ThemeColor.setColors(colors, standart_colors);
    });
};

// --- styles and fonts --------------------------------------------------------

EditorUIController.initEditorStyles = (storeCellSettings) => {
    api().asc_registerCallback('asc_onInitEditorStyles', styles => {
        storeCellSettings.initCellStyles(styles);
    });
};

EditorUIController.initFonts = (props) => {
    const { storeCellSettings, storeTextSettings } = props;
    const sdk = api();

    sdk.asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        storeCellSettings.initEditorFonts(fonts, select);
        storeTextSettings.initEditorFonts(fonts, select);
    });

    sdk.asc_registerCallback('asc_onEditorSelectionChanged', fontObj => {
        storeCellSettings.initFontInfo(fontObj);
        storeTextSettings.initFontInfo(fontObj);
    });
};

// --- selection / focus objects -----------------------------------------------

const isObjectSelection = (selType) => {
    switch (selType) {
        case Asc.c_oAscSelectionType.RangeImage:
        case Asc.c_oAscSelectionType.RangeShape:
        case Asc.c_oAscSelectionType.RangeChart:
        case Asc.c_oAscSelectionType.RangeChartText:
        case Asc.c_oAscSelectionType.RangeShapeText:
            return true;
    }

    return false;
};

EditorUIController.initCellInfo = (props) => {
    const { storeFocusObjects, storeCellSettings, storeTextSettings, storeChartSettings } = props;
    const sdk = api();

    // Read the state from the observable properties on every call so the
    // computed values in the store stay reactive.
    const objects = () => storeFocusObjects._focusObjects || [];

    // Returns the value of the last (top) object matching the predicate.
    const getTop = (predicate) => {
        const found = objects().filter(predicate);

        return found.length > 0 ? found[found.length - 1].get_ObjectValue() : undefined;
    };

    const isImageType = o => o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image;

    storeFocusObjects.intf = {
        getSelections: () => {
            const cellInfo = storeFocusObjects._cellInfo;
            const _selections = [];

            if (!cellInfo) return _selections;

            let isCell, isChart, isImage, isTextShape, isShape, isTextChart;
            const selType = cellInfo.asc_getSelectionType();

            switch (selType) {
                case Asc.c_oAscSelectionType.RangeCells:     isCell = true; break;
                case Asc.c_oAscSelectionType.RangeImage:     isImage = true; break;
                case Asc.c_oAscSelectionType.RangeShape:     isShape = true; break;
                case Asc.c_oAscSelectionType.RangeChart:     isChart = true; break;
                case Asc.c_oAscSelectionType.RangeChartText: isTextChart = true; break;
                case Asc.c_oAscSelectionType.RangeShapeText: isTextShape = true; break;
            }

            if (isImage || isShape || isChart) {
                isImage = isShape = isChart = false;

                const selectedObjects = sdk.asc_getGraphicObjectProps();

                for (let i = 0; i < selectedObjects.length; i++) {
                    if (selectedObjects[i].asc_getObjectType() == Asc.c_oAscTypeSelectElement.Image) {
                        const elValue = selectedObjects[i].asc_getObjectValue();
                        const shapeProps = elValue.asc_getShapeProperties();

                        if (shapeProps) {
                            if (shapeProps.asc_getFromChart()) {
                                isChart = true;
                            } else {
                                isShape = true;
                            }
                        } else if (elValue.asc_getChartProperties()) {
                            isChart = true;
                        } else {
                            isImage = true;
                        }
                    }
                }
            }

            if (isChart || isTextChart) {
                _selections.push('chart');

                if (isTextChart) {
                    _selections.push('text');
                }
            } else if ((isShape || isTextShape) && !isImage) {
                _selections.push('shape');

                if (isTextShape) {
                    _selections.push('text');
                }
            } else if (isImage) {
                _selections.push('image');

                if (isShape) {
                    _selections.push('shape');
                }
            } else {
                _selections.push('cell');

                if (cellInfo.asc_getHyperlink()) {
                    _selections.push('hyperlink');
                }
            }

            return _selections;
        },

        getShapeObject: () => getTop(o => isImageType(o) && o.get_ObjectValue() && o.get_ObjectValue().get_ShapeProperties()),

        getImageObject: () => getTop(isImageType),

        getChartObject: () => getTop(o => isImageType(o) && o.get_ObjectValue() && o.get_ObjectValue().get_ChartProperties()),

        getParagraphObject: () => getTop(o => o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Paragraph),

        // A formatted table the active cell belongs to (not a graphic object).
        // Written for the current stores; there was no public version of this one.
        getTableObject: () => {
            const cellInfo = storeFocusObjects._cellInfo;

            return cellInfo && typeof cellInfo.asc_getTableInfo === 'function' ? (cellInfo.asc_getTableInfo() || undefined) : undefined;
        },
    };

    sdk.asc_registerCallback('asc_onSelectionChanged', cellInfo => {
        storeFocusObjects.resetCellInfo(cellInfo);
        storeCellSettings.initCellSettings(cellInfo);
        storeTextSettings.initTextSettings(cellInfo);

        const selectedObjects = sdk.asc_getGraphicObjectProps() || [];

        storeFocusObjects.resetFocusObjects(selectedObjects);
        storeFocusObjects.changeFocus(isObjectSelection(cellInfo.asc_getSelectionType()));
        storeFocusObjects.setIsLocked(cellInfo);

        // Chart settings
        const chartObject = storeFocusObjects.chartObject;

        if (chartObject && chartObject.get_ChartProperties()) {
            storeChartSettings.updateChartStyles(sdk.asc_getChartPreviews(chartObject.get_ChartProperties().getType()));
        }
    });
};

// --- toolbar -----------------------------------------------------------------

const undoRedo = ({ disabledUndo, disabledRedo, onUndoClick, onRedoClick }) => (
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

const editOptions = ({ disabledEdit, disabledAdd, focusOn, isShapeLocked, onEditClick, onAddClick }) => (
    <Fragment>
        <Link iconOnly key='edit-settings-link' id='btn-edit' href={false}
              className={(disabledEdit || (focusOn === 'obj' && isShapeLocked)) ? 'disabled' : ''}
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

EditorUIController.toolbarOptions = {
    getUndoRedo: undoRedo,
    getEditOptions: editOptions,
};

// --- context menu ------------------------------------------------------------
//
// `ctx` is the ContextMenu controller instance. 'openlink' is added by the
// controller itself, so it is not produced here. Only events handled here
// return true from handleMenuItemClick; everything else falls through to the
// controller's own switch.

EditorUIController.ContextMenu = {
    mapMenuItems: (ctx) => {
        const { t, canViewComments, canCoAuthoring, canComments } = ctx.props;
        const _t = t("ContextMenu", { returnObjects: true });
        const sdk = api();
        const cellinfo = sdk.asc_getCellInfo();

        const itemsIcon = [];
        const itemsText = [];

        let iscellmenu, isrowmenu, iscolmenu, ischartmenu, isimagemenu, istextshapemenu, isshapemenu, istextchartmenu;
        let iscelllocked = cellinfo.asc_getLocked();
        const seltype = cellinfo.asc_getSelectionType();
        const xfs = cellinfo.asc_getXfs();
        const isComments = cellinfo.asc_getComments().length > 0; // prohibit adding multiple comments in one cell

        switch (seltype) {
            case Asc.c_oAscSelectionType.RangeCells:     iscellmenu  = true;     break;
            case Asc.c_oAscSelectionType.RangeRow:       isrowmenu   = true;     break;
            case Asc.c_oAscSelectionType.RangeCol:       iscolmenu   = true;     break;
            case Asc.c_oAscSelectionType.RangeImage:     isimagemenu = true;     break;
            case Asc.c_oAscSelectionType.RangeShape:     isshapemenu = true;     break;
            case Asc.c_oAscSelectionType.RangeChart:     ischartmenu = true;     break;
            case Asc.c_oAscSelectionType.RangeChartText: istextchartmenu = true; break;
            case Asc.c_oAscSelectionType.RangeShapeText: istextshapemenu = true; break;
        }

        const isObject = isimagemenu || isshapemenu || ischartmenu || istextshapemenu || istextchartmenu;

        if (!iscelllocked && isObject) {
            sdk.asc_getGraphicObjectProps().every((object) => {
                if (object.asc_getObjectType() == Asc.c_oAscTypeSelectElement.Image) {
                    iscelllocked = object.asc_getObjectValue().asc_getLocked();
                }

                return !iscelllocked;
            });
        }

        if (iscelllocked || sdk.isCellEdited) {
            itemsIcon.push({
                event: 'copy',
                icon: IconCopy.id
            });
        } else {
            itemsIcon.push({
                event: 'cut',
                icon: IconCut.id
            });
            itemsIcon.push({
                event: 'copy',
                icon: IconCopy.id
            });
            itemsIcon.push({
                event: 'paste',
                icon: IconPaste.id
            });
            itemsText.push({
                caption: _t.menuDelete,
                event: 'del'
            });

            if (isObject) {
                itemsText.push({
                    caption: _t.menuEdit,
                    event: 'edit'
                });
            } else {
                if (iscolmenu || isrowmenu) {
                    itemsText.push({
                        caption: _t.menuHide,
                        event: 'hide'
                    });
                    itemsText.push({
                        caption: _t.menuShow,
                        event: 'show'
                    });
                } else if (iscellmenu) {
                    itemsText.push({
                        caption: _t.menuCell,
                        event: 'edit'
                    });

                    if (cellinfo.asc_getMerge() == Asc.c_oAscMergeOptions.None) {
                        itemsText.push({
                            caption: _t.menuMerge,
                            event: 'merge'
                        });
                    }

                    if (cellinfo.asc_getMerge() == Asc.c_oAscMergeOptions.Merge) {
                        itemsText.push({
                            caption: _t.menuUnmerge,
                            event: 'unmerge'
                        });
                    }

                    itemsText.push(
                        xfs.asc_getWrapText() ?
                            {
                                caption: _t.menuUnwrap,
                                event: 'unwrap'
                            } :
                            {
                                caption: _t.menuWrap,
                                event: 'wrap'
                            });

                    if (!cellinfo.asc_getHyperlink() && !cellinfo.asc_getMultiselect() &&
                        !cellinfo.asc_getLockText() && !!cellinfo.asc_getText()) {
                        itemsText.push({
                            caption: _t.menuAddLink,
                            event: 'addlink'
                        });
                    }
                }

                itemsText.push({
                    caption: sdk.asc_getSheetViewSettings().asc_getIsFreezePane() ? _t.menuUnfreezePanes : _t.menuFreezePanes,
                    event: 'freezePanes'
                });
            }

            if (canViewComments && canCoAuthoring && canComments) {
                if (isComments) {
                    itemsText.push({
                        caption: _t.menuViewComment,
                        event: 'viewcomment'
                    });
                } else if (iscellmenu) {
                    itemsText.push({
                        caption: _t.menuAddComment,
                        event: 'addcomment'
                    });
                }
            }
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
                return !!sdk.asc_Cut();
            case 'paste':
                return !!sdk.asc_Paste();
            case 'addcomment':
                Common.Notifications.trigger('addcomment');
                return true;
            case 'del':
                sdk.asc_emptyCells(Asc.c_oAscCleanOptions.All);
                return true;
            case 'wrap':
                sdk.asc_setCellTextWrap(true);
                return true;
            case 'unwrap':
                sdk.asc_setCellTextWrap(false);
                return true;
            case 'edit':
            case 'editlink':
                setTimeout(() => {
                    ctx.props.openOptions('edit');
                }, 0);
                return true;
            case 'merge': {
                const _t = ctx.props.t("ContextMenu", { returnObjects: true });

                if (sdk.asc_mergeCellsDataLost(Asc.c_oAscMergeOptions.Merge)) {
                    setTimeout(() => {
                        f7.dialog.confirm(_t.warnMergeLostData, _t.notcriticalErrorTitle, () => {
                            sdk.asc_mergeCells(Asc.c_oAscMergeOptions.Merge);
                        });
                    }, 0);
                } else {
                    sdk.asc_mergeCells(Asc.c_oAscMergeOptions.Merge);
                }

                return true;
            }
            case 'unmerge':
                sdk.asc_mergeCells(Asc.c_oAscMergeOptions.None);
                return true;
            case 'hide':
            case 'show': {
                const isRow = sdk.asc_getCellInfo().asc_getSelectionType() == Asc.c_oAscSelectionType.RangeRow;
                const method = action === 'hide' ? (isRow ? 'asc_hideRows' : 'asc_hideColumns') : (isRow ? 'asc_showRows' : 'asc_showColumns');

                sdk[method]();
                return true;
            }
            case 'addlink':
                setTimeout(() => {
                    ctx.props.openOptions('add', 'link');
                }, 400);
                return true;
            case 'freezePanes':
                sdk.asc_freezePane();
                return true;
        }

        return false;
    },
};

export default EditorUIController;
