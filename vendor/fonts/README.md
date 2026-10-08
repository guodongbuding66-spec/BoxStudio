# BoxStudio Chinese interface font

`boxstudio-ui-sc.woff` is a renamed Simplified Chinese subset of Noto Sans CJK
Regular (Debian fonts-noto-cjk 20220127 package, SC collection index 2), licensed
under the SIL Open Font License. The package copyright and license are included
in LICENSE.txt. Subsetting was done with fontTools using the characters in
src/ and tests/ plus the editor action labels. The font contains the characters
used by the interface; it is not a complete font for arbitrary customer artwork.
Custom artwork font upload and PDF font embedding use the existing font pipeline.

Rebuild from the original collection with fontTools when introducing interface
characters outside this subset. Preserve the license and use the BoxStudio UI SC
family name for the modified font.
